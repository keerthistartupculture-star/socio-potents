import { NextResponse } from 'next/server';
import { getAdminSession, requireRole } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import { generateReport } from '@/services/reportService';
import { logger } from '@/lib/logger';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminSession();
  if (!requireRole(admin, ['ADMIN', 'SUPER_ADMIN', 'COUNSELOR'])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const report = await prisma.report.findUnique({ where: { id: params.id }, include: { user: { select: { name: true, email: true } } } });
  if (!report) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  return NextResponse.json({ report });
}

// Admin "Regenerate" action (spec §31) — reruns the deterministic pipeline against the
// already-persisted assessment responses, no re-assessment needed.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminSession();
  if (!requireRole(admin, ['ADMIN', 'SUPER_ADMIN'])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await prisma.report.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  try {
    const report = await generateReport(existing.assessmentId);
    return NextResponse.json({ report });
  } catch (err) {
    logger.error('Admin report regeneration failed', { reportId: params.id, error: String(err) });
    return NextResponse.json({ error: 'Regeneration failed.' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminSession();
  if (!requireRole(admin, ['SUPER_ADMIN'])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await prisma.report.delete({ where: { id: params.id } });
  return NextResponse.json({ deleted: true });
}
