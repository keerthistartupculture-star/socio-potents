import { NextResponse } from 'next/server';
import { getAdminSession, requireRole } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import type { AssessmentStatus, AssessmentFramework } from '@prisma/client';

export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!requireRole(admin, ['ADMIN', 'SUPER_ADMIN', 'COUNSELOR'])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') as AssessmentStatus | null;
  const framework = searchParams.get('framework') as AssessmentFramework | null;
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const pageSize = Math.min(50, Number(searchParams.get('pageSize') ?? 20));

  const where = { ...(status ? { status } : {}), ...(framework ? { framework } : {}) };

  const [total, assessments] = await Promise.all([
    prisma.assessment.count({ where }),
    prisma.assessment.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, educationLevel: true } },
        personalityScore: true,
        report: { select: { id: true, status: true } },
        recommendations: { orderBy: { rank: 'asc' }, take: 1, include: { career: { select: { title: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({ total, page, pageSize, assessments });
}
