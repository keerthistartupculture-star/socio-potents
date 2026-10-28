import { NextResponse } from 'next/server';
import { getAdminSession, requireRole } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!requireRole(admin, ['ADMIN', 'SUPER_ADMIN', 'COUNSELOR'])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const pageSize = Math.min(50, Number(searchParams.get('pageSize') ?? 20));

  const [total, reports] = await Promise.all([
    prisma.report.count(),
    prisma.report.findMany({
      include: {
        user: { select: { name: true, email: true } },
        assessment: { select: { framework: true, completedAt: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({ total, page, pageSize, reports });
}
