import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { trackEvent } from '@/services/analyticsService';
import { renderReportPdfBuffer, storeReportPdf } from '@/services/pdfService';
import { logger } from '@/lib/logger';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });

  const report = await prisma.report.findUnique({ where: { id: params.id }, include: { user: { select: { name: true } } } });
  if (!report || report.userId !== userId) {
    return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
  }
  if (report.status !== 'READY') {
    return NextResponse.json({ error: 'Your report is still being prepared. Please try again in a minute.' }, { status: 409 });
  }

  // The stored file is only a cache: the PDF is always rebuildable from reportJson, so a file
  // lost to a redeploy / ephemeral disk (or a failed first render) never blocks a download and
  // the test never has to be retaken.
  let buffer: Buffer | null = null;
  if (report.pdfPath) buffer = await fs.readFile(report.pdfPath).catch(() => null);
  if (!buffer) {
    try {
      buffer = await renderReportPdfBuffer(report.reportJson);
      const pdfPath = await storeReportPdf(report.id, buffer).catch(() => null);
      if (pdfPath) await prisma.report.update({ where: { id: report.id }, data: { pdfPath } });
    } catch (err) {
      logger.error('PDF render failed on download', { reportId: report.id, error: String(err) });
      return NextResponse.json({ error: 'We could not create the PDF right now. Please try again shortly.' }, { status: 500 });
    }
  }

  await prisma.report.update({ where: { id: report.id }, data: { downloadedAt: new Date() } });
  await trackEvent(userId, 'report_downloaded', { report_id: report.id });

  const safeName = (report.user.name || 'career').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'career';
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeName}-strengths-report.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
