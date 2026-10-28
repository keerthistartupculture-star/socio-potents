import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireOwnedAssessment } from '@/lib/assessmentAccess';
import { AssessmentSessionClient } from '@/components/assessment/AssessmentSessionClient';
import { DotGridBackground, BlobAccent, PathLines } from '@/components/marketing/BackgroundVectors';

export default async function AssessmentSessionPage({ params }: { params: { id: string } }) {
  const access = await requireOwnedAssessment(params.id);
  if (!access) redirect('/login');
  if (access.assessment.status === 'COMPLETED') {
    // A submitted attempt can't be answered again — reopen its report instead.
    const report = await prisma.report.findUnique({ where: { assessmentId: params.id }, select: { id: true } });
    redirect(report ? `/report/${report.id}` : '/dashboard');
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      {/* This is a functional conversation UI, not marketing content, so the chat column
          itself stays clean — but the margins around it get the same vector treatment as
          the rest of the site rather than being almost invisible. Shown from `lg:` up
          (1024px) since the centered max-w-2xl chat column leaves comfortable margin space
          well before the old `xl:` (1280px) cutoff, which hid these on plenty of real
          laptop-width windows. */}
      <DotGridBackground className="pointer-events-none absolute inset-0 h-full w-full text-muted-foreground/20" />
      <PathLines className="pointer-events-none absolute inset-0 hidden h-full w-full opacity-[0.07] lg:block" />
      <BlobAccent className="pointer-events-none absolute -right-28 -top-16 hidden h-[360px] w-[360px] opacity-[0.08] lg:block" />
      <BlobAccent flip className="pointer-events-none absolute -left-28 bottom-0 hidden h-[300px] w-[300px] opacity-[0.07] lg:block" />
      <div className="relative z-10">
        <AssessmentSessionClient assessmentId={params.id} framework={access.assessment.framework} />
      </div>
    </div>
  );
}
