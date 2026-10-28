import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { trackEvent } from '@/services/analyticsService';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });

  const report = await prisma.report.findUnique({ where: { id: params.id } });
  if (!report || report.userId !== userId) {
    return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
  }

  if (!report.viewedAt) {
    await prisma.report.update({ where: { id: report.id }, data: { viewedAt: new Date() } });
    await prisma.assessmentProgress.update({
      where: { assessmentId: report.assessmentId },
      data: { reportViewedAt: new Date() },
    }).catch(() => undefined);
    await trackEvent(userId, 'report_viewed', { report_id: report.id, assessment_id: report.assessmentId });
  }

  return NextResponse.json({
    id: report.id,
    status: report.status,
    report: report.reportJson,
    hasPdf: Boolean(report.pdfPath),
  });
}
