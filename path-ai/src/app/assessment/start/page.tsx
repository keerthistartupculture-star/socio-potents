import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { frameworkForEducation, isMinorEducationLevel } from '@/config/frameworks';
import { StartAssessmentPanel } from '@/components/assessment/StartAssessmentPanel';

export default async function AssessmentStartPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  // Signed-out visitors (e.g. from the Socio Potents menu) come back here after logging in.
  if (!userId) redirect('/login?next=/assessment/start');

  // A session can outlive its user (e.g. a reset database) — send it back to sign in.
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) redirect('/login?next=/assessment/start');
  const framework = frameworkForEducation(user.educationLevel);
  const demoModeSetting = await prisma.systemSettings.findUnique({ where: { key: 'demoMode' } });
  const demoModeEnabled = Boolean((demoModeSetting?.value as { enabled?: boolean } | undefined)?.enabled);

  const openAttempt = await prisma.assessment.findFirst({
    where: { userId, isDemo: false, status: { in: ['IN_PROGRESS', 'PAUSED', 'NOT_STARTED'] }, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    select: { id: true, _count: { select: { responses: true } } },
  });

  return (
    <StartAssessmentPanel
      openAttempt={openAttempt ? { id: openAttempt.id, answered: openAttempt._count.responses } : null}
      userName={user.name}
      framework={framework}
      isMinor={isMinorEducationLevel(user.educationLevel)}
      demoModeEnabled={demoModeEnabled}
    />
  );
}
