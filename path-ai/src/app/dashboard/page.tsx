import { BASE_PATH } from '@/lib/basePath';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import {
  Sparkles, Award, Clock, ListChecks, CheckCircle2, PlayCircle, PauseCircle,
  FileText, RotateCcw, ArrowRight, TrendingUp, Download,
} from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { buttonClasses } from '@/components/ui/Button';
import { PersonalityMiniChart } from '@/components/dashboard/PersonalityMiniChart';
import { fitLabel } from '@/lib/parentReport';
import { DotGridBackground, BlobAccent, PathLines, CompassRings } from '@/components/marketing/BackgroundVectors';
import { getBranding } from '@/lib/branding';
import type { AssessmentStatus } from '@prisma/client';

const RETAKE_DAYS = 90;

const STATUS_STYLES: Record<AssessmentStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  COMPLETED: { label: 'Completed', icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-700' },
  IN_PROGRESS: { label: 'In progress', icon: PlayCircle, className: 'bg-amber-100 text-amber-700' },
  PAUSED: { label: 'Paused', icon: PauseCircle, className: 'bg-amber-100 text-amber-700' },
  NOT_STARTED: { label: 'Not started', icon: Clock, className: 'bg-muted text-muted-foreground' },
  ABANDONED: { label: 'Abandoned', icon: Clock, className: 'bg-muted text-muted-foreground' },
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect('/login');

  const [user, branding] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        assessments: {
          orderBy: { createdAt: 'desc' },
          include: {
            personalityScore: true,
            report: true,
            recommendations: { orderBy: { rank: 'asc' }, take: 6, include: { career: true } },
            _count: { select: { responses: true } },
          },
        },
      },
    }),
    getBranding(),
  ]);

  // A new attempt in progress and the last completed report are kept apart: results, matches and
  // "View report" always come from the latest *completed* attempt, so starting a retake never hides
  // or blanks a finished report. The open attempt only drives the "Continue" button.
  const openAttempt = user.assessments.find((a) => a.status === 'IN_PROGRESS' || a.status === 'PAUSED' || a.status === 'NOT_STARTED');
  const latest = user.assessments.find((a) => a.status === 'COMPLETED' && a.report) ?? openAttempt;
  const latestCompleted = latest?.status === 'COMPLETED' ? latest : undefined;
  const daysSinceCompletion = latestCompleted?.completedAt ? Math.floor((Date.now() - latestCompleted.completedAt.getTime()) / 86_400_000) : null;
  const canRetake = !openAttempt && (!latestCompleted || (daysSinceCompletion ?? 0) > RETAKE_DAYS);
  const completedCount = user.assessments.filter((a) => a.status === 'COMPLETED').length;
  const topMatch = latestCompleted?.recommendations[0];
  // Attempt numbers count from the first attempt (list is newest-first).
  const attemptNumber = (id: string) => user.assessments.length - user.assessments.findIndex((a) => a.id === id);

  return (
    <div>
      {/* Welcome banner */}
      <section className="relative overflow-hidden bg-muted/40">
        <DotGridBackground className="absolute inset-0 h-full w-full text-muted-foreground/25" />
        <BlobAccent className="pointer-events-none absolute -right-24 -top-24 h-[320px] w-[320px] opacity-[0.08]" />
        <div className="relative z-10 mx-auto max-w-5xl px-4 py-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Welcome back</p>
              <h1 className="text-3xl font-bold">{user.name.split(' ')[0]}</h1>
            </div>
            {latest && (
              <div className="flex flex-wrap gap-2">
                {openAttempt && (
                  <Link
                    href={`/assessment/session/${openAttempt.id}`}
                    className={buttonClasses({ className: 'font-semibold text-black hover:brightness-95' })}
                    style={{ backgroundColor: branding.primaryColor }}
                  >
                    Continue Assessment <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                )}
                {latestCompleted?.report && (
                  <Link
                    href={`/report/${latestCompleted.report.id}`}
                    className={buttonClasses({ variant: openAttempt ? 'outline' : 'primary', className: openAttempt ? '' : 'font-semibold text-black hover:brightness-95' })}
                    style={openAttempt ? undefined : { backgroundColor: branding.primaryColor }}
                  >
                    View Latest Report <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="relative overflow-hidden">
        <PathLines className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.04]" />
        <div className="relative z-10 mx-auto max-w-5xl px-4 py-10">
        {!latest ? (
          <Card className="relative overflow-hidden">
            <BlobAccent className="pointer-events-none absolute -right-16 -top-16 h-[220px] w-[220px] opacity-[0.06]" />
            <CardContent className="relative z-10 flex flex-col items-center gap-4 py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full text-black" style={{ backgroundColor: branding.primaryColor }}>
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">You have not started an assessment yet</p>
                <p className="mt-1 text-sm text-muted-foreground">About 10–15 minutes of chat — every answer is saved as you go.</p>
              </div>
              <Link
                href="/assessment/start"
                className={buttonClasses({ className: 'font-semibold text-black hover:brightness-95' })}
                style={{ backgroundColor: branding.primaryColor }}
              >
                Start Career Assessment
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={ListChecks} label="Assessments completed" value={String(completedCount)} accent={branding.primaryColor} />
              <StatCard
                icon={Award}
                label="First career to explore"
                value={topMatch ? topMatch.career.title : '—'}
                accent={branding.primaryColor}
              />
              <StatCard
                icon={TrendingUp}
                // Was "Result confidence N%": an average of the AI's own per-answer confidence,
                // not a measured reliability, so it is not shown to users.
                label="Answers in latest report"
                value={latestCompleted ? String(latestCompleted._count.responses) : '—'}
                accent={branding.primaryColor}
              />
              <StatCard
                icon={RotateCcw}
                label="Retake available"
                value={openAttempt ? 'In progress' : canRetake ? 'Now' : `in ${RETAKE_DAYS - (daysSinceCompletion ?? 0)}d`}
                accent={branding.primaryColor}
              />
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-3">
              {/* Main column */}
              <div className="space-y-6 lg:col-span-2">
                {!latestCompleted && openAttempt && (
                  <Card>
                    <CardContent className="py-6 text-sm">
                      <p className="font-medium">Your assessment is in progress — {openAttempt._count.responses} answers saved.</p>
                      <p className="mt-1 text-muted-foreground">Continue where you left off; your results will appear here after you submit.</p>
                    </CardContent>
                  </Card>
                )}

                {latestCompleted?.personalityScore && (
                  <Card className="relative overflow-hidden">
                    <BlobAccent className="pointer-events-none absolute -right-16 -top-16 h-[220px] w-[220px] opacity-[0.06]" />
                    <CardHeader className="relative z-10">
                      <CardTitle>What came through in your answers</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Self-described tendencies from your latest assessment — not tested skills
                      </p>
                    </CardHeader>
                    <CardContent className="relative z-10">
                      <PersonalityMiniChart
                        framework={latestCompleted.framework}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        bigFive={latestCompleted.personalityScore.bigFive as any}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        mbti={latestCompleted.personalityScore.mbti as any}
                      />
                    </CardContent>
                  </Card>
                )}

                {latestCompleted && latestCompleted.recommendations.length > 0 && (
                  <Card className="relative overflow-hidden">
                    <DotGridBackground className="absolute inset-0 h-full w-full text-muted-foreground/[0.08]" />
                    <CardHeader className="relative z-10 flex flex-row items-center justify-between">
                      <CardTitle>Careers worth exploring</CardTitle>
                      {latestCompleted.report && (
                        <Link href={`/report/${latestCompleted.report.id}`} className="text-xs font-medium text-foreground hover:underline">
                          View full report
                        </Link>
                      )}
                    </CardHeader>
                    <CardContent className="relative z-10 space-y-3">
                      {latestCompleted.recommendations.map((r) => (
                        <div key={r.id} className="rounded-lg border border-border bg-card p-3">
                          <div className="flex items-center justify-between text-sm">
                            <p className="font-medium">{r.career.title}</p>
                            <span className="font-semibold" style={{ color: '#8a6d00' }}>{fitLabel(r.matchScore)}</span>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Phase 4: practical skill checks. Offered, never assigned — the learner chooses. */}
                <Card>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 py-5">
                    <div>
                      <p className="font-semibold">Try a practical skill check</p>
                      <p className="text-sm text-muted-foreground">
                        Short real-work tasks marked by a trainer, showing which skills to build next. You choose the pathway.
                      </p>
                    </div>
                    <Link href="/pathways" className={buttonClasses({ variant: 'outline', size: 'sm' })}>
                      See skill pathways
                    </Link>
                  </CardContent>
                </Card>
              </div>

              {/* Side column: history timeline */}
              <div>
                <Card className="relative overflow-hidden">
                  <CompassRings className="pointer-events-none absolute -bottom-16 -right-16 h-[220px] w-[220px] text-foreground/[0.05]" />
                  <CardHeader className="relative z-10"><CardTitle>Assessment history</CardTitle></CardHeader>
                  <CardContent className="relative z-10">
                    <ol className="space-y-5 border-l border-border pl-5">
                      {user.assessments.map((a) => {
                        const style = STATUS_STYLES[a.status];
                        const StatusIcon = style.icon;
                        return (
                          <li key={a.id} className="relative">
                            <span
                              className="absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full text-black"
                              style={{ backgroundColor: branding.primaryColor }}
                            >
                              <StatusIcon className="h-3 w-3" />
                            </span>
                            <p className="text-sm font-medium">Attempt {attemptNumber(a.id)}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(a.createdAt).toLocaleDateString()} · ID {a.id.slice(-8)} · {a._count.responses} answers
                            </p>
                            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${style.className}`}>{style.label}</span>
                            {a.status === 'COMPLETED' && a.report && (
                              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                                <Link href={`/report/${a.report.id}`} className="flex items-center gap-1 text-xs font-medium text-foreground hover:underline">
                                  <FileText className="h-3 w-3" aria-hidden /> View report
                                </Link>
                                <a href={`${BASE_PATH}/api/report/${a.report.id}/pdf`} className="flex items-center gap-1 text-xs font-medium text-foreground hover:underline">
                                  <Download className="h-3 w-3" aria-hidden /> Download PDF
                                </a>
                              </div>
                            )}
                            {(a.status === 'IN_PROGRESS' || a.status === 'PAUSED') && (
                              <Link href={`/assessment/session/${a.id}`} className="mt-2 flex items-center gap-1 text-xs font-medium text-foreground hover:underline">
                                <PlayCircle className="h-3 w-3" aria-hidden /> Continue
                              </Link>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  </CardContent>
                </Card>

                <div className="mt-4">
                  {openAttempt ? null : canRetake ? (
                    <Link href="/assessment/start" className={buttonClasses({ variant: 'outline', className: 'w-full' })}>
                      Retake Assessment
                    </Link>
                  ) : (
                    <p className="text-center text-xs text-muted-foreground">
                      You can retake the assessment after {RETAKE_DAYS} days from your last completion.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: typeof Sparkles; label: string; value: string; accent: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-black" style={{ backgroundColor: accent }}>
          <Icon className="h-5 w-5" strokeWidth={2.25} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
