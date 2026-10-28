import { NextResponse } from 'next/server';
import { getAdminSession, requireRole } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

/** Marks a flagged mentor message as reviewed by the signed-in admin/counsellor. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminSession();
  if (!requireRole(admin, ['ADMIN', 'SUPER_ADMIN', 'COUNSELOR'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const updated = await prisma.mentorMessage.updateMany({
    where: { id: params.id, flagReason: { not: null } },
    data: { reviewedAt: new Date(), reviewedById: admin!.adminId },
  });
  if (updated.count === 0) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  return NextResponse.json({ reviewed: true });
}
