import { NextResponse } from 'next/server';
import { getAdminSession, requireRole } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import type { EducationLevel, AssessmentStatus } from '@prisma/client';

// Admin user search/filter/list (spec §17). Paginated — never loads the full user table
// into the browser (spec §34).

export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!requireRole(admin, ['ADMIN', 'SUPER_ADMIN', 'COUNSELOR'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  const educationLevel = searchParams.get('educationLevel') as EducationLevel | null;
  const assessmentStatus = searchParams.get('assessmentStatus') as AssessmentStatus | null;
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const pageSize = Math.min(50, Number(searchParams.get('pageSize') ?? 20));

  const where = {
    deletedAt: null,
    ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' as const } }, { email: { contains: q, mode: 'insensitive' as const } }] } : {}),
    ...(educationLevel ? { educationLevel } : {}),
    ...(assessmentStatus ? { assessments: { some: { status: assessmentStatus } } } : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        educationLevel: true,
        createdAt: true,
        assessments: {
          select: { id: true, status: true, framework: true, completedAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({ total, page, pageSize, users });
}
