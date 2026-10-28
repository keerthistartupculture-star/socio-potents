import { NextResponse } from 'next/server';
import { getAdminSession, requireRole } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import { questionUpsertSchema } from '@/lib/validation';

export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!requireRole(admin, ['ADMIN', 'SUPER_ADMIN'])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const framework = searchParams.get('framework');
  const questions = await prisma.question.findMany({
    where: {
      followUpOfId: null,
      ...(framework ? { framework: framework as 'BIG_FIVE' | 'MBTI' } : {}),
    },
    orderBy: { code: 'asc' },
  });
  return NextResponse.json({ questions });
}

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!requireRole(admin, ['ADMIN', 'SUPER_ADMIN'])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = questionUpsertSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid question data.', issues: parsed.error.flatten() }, { status: 400 });

  const question = await prisma.question.create({ data: parsed.data });
  return NextResponse.json({ question });
}
