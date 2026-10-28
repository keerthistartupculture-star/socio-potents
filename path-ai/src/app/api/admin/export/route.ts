import { NextResponse } from 'next/server';
import { getAdminSession, requireRole } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

// CSV export for users/assessments/personality/career-recommendations (spec §33).
// Streams a modest row cap rather than the whole table (spec §34).

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))];
  return lines.join('\n');
}

const MAX_ROWS = 5000;

export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!requireRole(admin, ['ADMIN', 'SUPER_ADMIN'])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');

  let csv = '';
  let filename = 'export.csv';

  if (type === 'users') {
    const users = await prisma.user.findMany({
      take: MAX_ROWS,
      select: { id: true, name: true, email: true, educationLevel: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    csv = toCsv(users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })));
    filename = 'users.csv';
  } else if (type === 'assessments') {
    const assessments = await prisma.assessment.findMany({
      take: MAX_ROWS,
      include: { user: { select: { email: true } }, personalityScore: true },
      orderBy: { createdAt: 'desc' },
    });
    csv = toCsv(
      assessments.map((a) => ({
        id: a.id,
        userEmail: a.user.email,
        framework: a.framework,
        status: a.status,
        mbtiType: a.personalityScore?.mbtiType ?? '',
        startedAt: a.startedAt?.toISOString() ?? '',
        completedAt: a.completedAt?.toISOString() ?? '',
        durationSeconds: a.durationSeconds ?? '',
      }))
    );
    filename = 'assessments.csv';
  } else if (type === 'career-recommendations') {
    const recs = await prisma.careerRecommendation.findMany({
      take: MAX_ROWS,
      include: { career: { select: { title: true } }, assessment: { select: { userId: true } } },
      orderBy: { createdAt: 'desc' },
    });
    csv = toCsv(
      recs.map((r) => ({ assessmentId: r.assessmentId, userId: r.assessment.userId, career: r.career.title, matchScore: r.matchScore, rank: r.rank }))
    );
    filename = 'career-recommendations.csv';
  } else {
    return NextResponse.json({ error: 'Unknown export type.' }, { status: 400 });
  }

  return new NextResponse(csv, {
    headers: { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="${filename}"` },
  });
}
