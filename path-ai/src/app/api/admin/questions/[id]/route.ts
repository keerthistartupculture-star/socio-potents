import { NextResponse } from 'next/server';
import { getAdminSession, requireRole } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import { questionUpsertSchema } from '@/lib/validation';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminSession();
  if (!requireRole(admin, ['ADMIN', 'SUPER_ADMIN'])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = questionUpsertSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid update.', issues: parsed.error.flatten() }, { status: 400 });

  const question = await prisma.question.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json({ question });
}

// Deactivate rather than hard-delete — preserves scoring history for assessments already
// taken with this question (spec §18 "Delete/deactivate question").
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminSession();
  if (!requireRole(admin, ['ADMIN', 'SUPER_ADMIN'])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await prisma.question.update({ where: { id: params.id }, data: { isActive: false } });
  return NextResponse.json({ deactivated: true });
}
