import { NextResponse } from 'next/server';
import { getAdminSession, requireRole } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

// Admin dashboard summary + chart data (spec §14/§15). Single endpoint keeps the dashboard
// to one request; date range narrows trend queries only, not the lifetime totals.

export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!requireRole(admin, ['ADMIN', 'SUPER_ADMIN', 'COUNSELOR'])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const range = searchParams.get('range') ?? '30d';
  const days = range === '7d' ? 7 : range === '90d' ? 90 : range === 'today' ? 1 : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    totalAssessments,
    completedAssessments,
    voiceAssessments,
    reportsGenerated,
    usersByEducation,
    completedInRange,
    recentAssessments,
    mbtiPersonalities,
    bigFivePersonalities,
    careerRecCounts,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.assessment.count(),
    prisma.assessment.count({ where: { status: 'COMPLETED' } }),
    prisma.assessmentSession.count({ where: { inputMethodUsed: { in: ['VOICE', 'MIXED'] } } }),
    prisma.report.count({ where: { status: 'READY' } }),
    prisma.user.groupBy({ by: ['educationLevel'], _count: true }),
    prisma.assessment.findMany({
      where: { status: 'COMPLETED', completedAt: { gte: since } },
      select: { completedAt: true, durationSeconds: true },
    }),
    prisma.assessment.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, status: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.personalityScore.groupBy({ by: ['mbtiType'], _count: true, where: { framework: 'MBTI', mbtiType: { not: null } } }),
    prisma.personalityScore.findMany({ where: { framework: 'BIG_FIVE' }, select: { bigFive: true } }),
    prisma.careerRecommendation.groupBy({
      by: ['careerId'],
      _count: { careerId: true },
      orderBy: { _count: { careerId: 'desc' } },
      take: 10,
    }),
  ]);

  const completionRate = totalAssessments > 0 ? Math.round((completedAssessments / totalAssessments) * 100) : 0;
  const avgDurationSeconds =
    completedInRange.length > 0
      ? Math.round(completedInRange.reduce((sum, a) => sum + (a.durationSeconds ?? 0), 0) / completedInRange.length)
      : 0;

  // Daily trend buckets
  const trendMap = new Map<string, { started: number; completed: number }>();
  for (const a of recentAssessments) {
    const key = a.createdAt.toISOString().slice(0, 10);
    const bucket = trendMap.get(key) ?? { started: 0, completed: 0 };
    bucket.started += 1;
    if (a.status === 'COMPLETED') bucket.completed += 1;
    trendMap.set(key, bucket);
  }
  const trend = Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  const bigFiveAverages: Record<string, number> = {};
  if (bigFivePersonalities.length > 0) {
    const dims = ['OPENNESS', 'CONSCIENTIOUSNESS', 'EXTRAVERSION', 'AGREEABLENESS', 'NEUROTICISM'];
    for (const dim of dims) {
      const scores = bigFivePersonalities
        .map((p) => (p.bigFive as Record<string, { score: number }> | null)?.[dim]?.score)
        .filter((n): n is number => typeof n === 'number');
      bigFiveAverages[dim] = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    }
  }

  const careerIds = careerRecCounts.map((c) => c.careerId);
  const careerTitles = await prisma.career.findMany({ where: { id: { in: careerIds } }, select: { id: true, title: true } });
  const titleById = new Map(careerTitles.map((c) => [c.id, c.title]));

  return NextResponse.json({
    cards: {
      totalUsers,
      totalAssessments,
      completedAssessments,
      incompleteAssessments: totalAssessments - completedAssessments,
      completionRate,
      avgDurationSeconds,
      reportsGenerated,
      voiceAssessments,
    },
    educationDistribution: usersByEducation.map((e) => ({ level: e.educationLevel, count: e._count })),
    trend,
    mbtiDistribution: mbtiPersonalities.map((m) => ({ type: m.mbtiType, count: m._count })),
    bigFiveAverages,
    topCareerRecommendations: careerRecCounts.map((c) => ({ career: titleById.get(c.careerId) ?? 'Unknown', count: c._count.careerId })),
    funnel: {
      registered: totalUsers,
      started: totalAssessments,
      completed: completedAssessments,
      reportsViewed: await prisma.report.count({ where: { viewedAt: { not: null } } }),
    },
  });
}
