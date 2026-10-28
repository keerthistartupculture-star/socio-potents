import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { trackEvent } from '@/services/analyticsService';
import { ReportView } from '@/components/report/ReportView';
import { DotGridBackground, BlobAccent } from '@/components/marketing/BackgroundVectors';

export default async function ReportPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect('/login');

  const report = await prisma.report.findUnique({ where: { id: params.id } });
  if (!report || report.userId !== userId) redirect('/dashboard');

  if (report.status === 'GENERATING') {
    return (
      <div className="relative overflow-hidden">
        <DotGridBackground className="pointer-events-none absolute inset-x-0 top-0 h-[420px] w-full text-muted-foreground/20" />
        <BlobAccent className="pointer-events-none absolute -right-24 -top-16 h-[320px] w-[320px] opacity-[0.06]" />
        <div className="relative z-10 mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="text-xl font-semibold">Your report is being generated...</h1>
          <p className="mt-2 text-muted-foreground">This usually takes under a minute. Refresh this page shortly.</p>
        </div>
      </div>
    );
  }

  if (!report.viewedAt) {
    await prisma.report.update({ where: { id: report.id }, data: { viewedAt: new Date() } });
    await prisma.assessmentProgress
      .update({ where: { assessmentId: report.assessmentId }, data: { reportViewedAt: new Date() } })
      .catch(() => undefined);
    await trackEvent(userId, 'report_viewed', { report_id: report.id, assessment_id: report.assessmentId });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <ReportView report={report.reportJson as any} reportId={report.id} />;
}
