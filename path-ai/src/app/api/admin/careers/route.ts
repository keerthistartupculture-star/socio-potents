import { NextResponse } from 'next/server';
import { getAdminSession, requireRole } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import { careerUpsertSchema } from '@/lib/validation';

export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!requireRole(admin, ['ADMIN', 'SUPER_ADMIN'])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get('categoryId');
  const careers = await prisma.career.findMany({
    where: categoryId ? { categoryId } : {},
    include: { category: true },
    orderBy: { title: 'asc' },
  });
  const categories = await prisma.careerCategory.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json({ careers, categories });
}

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!requireRole(admin, ['ADMIN', 'SUPER_ADMIN'])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = careerUpsertSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid career data.', issues: parsed.error.flatten() }, { status: 400 });

  const slug = parsed.data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const career = await prisma.career.create({
    data: {
      ...parsed.data,
      slug,
      personalityAlignment: parsed.data.personalityAlignment,
    },
  });
  return NextResponse.json({ career });
}
