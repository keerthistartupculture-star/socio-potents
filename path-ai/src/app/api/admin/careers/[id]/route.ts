import { NextResponse } from 'next/server';
import { getAdminSession, requireRole } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import { careerUpsertSchema } from '@/lib/validation';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminSession();
  if (!requireRole(admin, ['ADMIN', 'SUPER_ADMIN'])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = careerUpsertSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid update.', issues: parsed.error.flatten() }, { status: 400 });

  const career = await prisma.career.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json({ career });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminSession();
  if (!requireRole(admin, ['ADMIN', 'SUPER_ADMIN'])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await prisma.career.update({ where: { id: params.id }, data: { isActive: false } });
  return NextResponse.json({ deactivated: true });
}
