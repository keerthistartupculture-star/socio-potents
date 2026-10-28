import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminSession, requireRole } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

const noteSchema = z.object({ note: z.string().trim().min(2).max(2000), assessmentId: z.string().optional() });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminSession();
  if (!requireRole(admin, ['ADMIN', 'SUPER_ADMIN', 'COUNSELOR'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid note.' }, { status: 400 });

  const note = await prisma.counselorNote.create({
    data: {
      counselorId: admin!.adminId,
      userId: params.id,
      assessmentId: parsed.data.assessmentId,
      note: parsed.data.note,
    },
  });

  return NextResponse.json({ note });
}
