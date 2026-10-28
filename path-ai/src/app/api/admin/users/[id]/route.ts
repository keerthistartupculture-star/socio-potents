import { NextResponse } from 'next/server';
import { getAdminSession, requireRole } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

// Full user detail for the admin/counselor view (spec §17): profile, assessment history,
// transcripts, personality result, career report, progress.

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminSession();
  if (!requireRole(admin, ['ADMIN', 'SUPER_ADMIN', 'COUNSELOR'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      profile: true,
      assessments: {
        orderBy: { createdAt: 'desc' },
        include: {
          personalityScore: true,
          report: true,
          progress: true,
          responses: {
            orderBy: { order: 'asc' },
            include: { question: true, voiceTranscript: true },
          },
          recommendations: { orderBy: { rank: 'asc' }, include: { career: true } },
        },
      },
      counselorNotes: { orderBy: { createdAt: 'desc' }, include: { counselor: { select: { name: true } } } },
    },
  });

  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  return NextResponse.json({ user });
}
