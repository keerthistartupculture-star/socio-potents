import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/** Confirms the signed-in user owns the given assessment. Returns null on any failure. */
export async function requireOwnedAssessment(assessmentId: string) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return null;

  const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId } });
  if (!assessment || assessment.userId !== userId) return null;

  return { userId, assessment };
}
