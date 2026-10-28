import { NextResponse } from 'next/server';
import { getAdminSession, requireRole } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

// Mentor messages flagged by lib/mentorSafety for a person to look at (possible crisis, a request
// for a human, or an AI reply that broke a rule). Crisis items come first.
export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!requireRole(admin, ['ADMIN', 'SUPER_ADMIN', 'COUNSELOR'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const showReviewed = new URL(req.url).searchParams.get('reviewed') === '1';

  const flagged = await prisma.mentorMessage.findMany({
    where: { role: 'USER', flagReason: { not: null }, reviewedAt: showReviewed ? { not: null } : null },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { user: { select: { id: true, name: true, email: true, educationLevel: true } } },
  });

  // The reply that was actually shown, so the reviewer sees both sides.
  const items = await Promise.all(
    flagged.map(async (m) => {
      const reply = await prisma.mentorMessage.findFirst({
        where: { userId: m.userId, role: 'ASSISTANT', createdAt: { gte: m.createdAt } },
        orderBy: { createdAt: 'asc' },
        select: { content: true },
      });
      return {
        id: m.id,
        flagReason: m.flagReason,
        message: m.content,
        reply: reply?.content ?? null,
        createdAt: m.createdAt,
        reviewedAt: m.reviewedAt,
        user: m.user,
      };
    })
  );
  const order: Record<string, number> = { CRISIS: 0, HUMAN_REQUESTED: 1, OUTPUT_GUARD: 2 };
  items.sort((a, b) => (order[a.flagReason ?? ''] ?? 9) - (order[b.flagReason ?? ''] ?? 9));
  return NextResponse.json({ items });
}
