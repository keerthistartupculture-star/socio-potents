'use client';

import { BASE_PATH } from '@/lib/basePath';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button, buttonClasses } from '@/components/ui/Button';
import {
  Download,
  Link as LinkIcon,
  Sparkles,
  BookOpen,
  Compass,
  Home,
  Sprout,
  Lightbulb,
  MessageCircle,
  Users,
  Scale,
  Puzzle,
  Eye,
  Ear,
  PenLine,
  Hand,
  Info,
  Route,
} from 'lucide-react';
import { DotGridBackground, BlobAccent } from '@/components/marketing/BackgroundVectors';
import { StepFlow } from '@/components/marketing/StepFlow';
import { MilestoneTimeline } from '@/components/report/MilestoneTimeline';
import { CareerMap } from '@/components/report/CareerMap';
import {
  audienceCopy,
  careerAreas,
  everydayScales,
  exploreStepsFor,
  firstName,
  fitLabel,
  normalizeAudience,
  plainList,
  plainStrengths,
  plainText,
  reportBasis,
  studyApproaches,
  studyStartingPoint,
  STUDY_NOTE,
  suggestionLimitsFor,
  type StudyApproach,
  type PersonalityProfileInput,
} from '@/lib/parentReport';

interface CareerMatch {
  careerId: string;
  title: string;
  category: string;
  matchScore: number;
  reasoning: { whyItFits?: string; personalityAlignment?: string; challenges?: string };
  skillGaps: string[];
  educationPathway: string[];
  entryLevelRoles: string[];
}

export interface ReportJson {
  meta: { studentName: string; assessmentDate: string; assessmentType: 'BIG_FIVE' | 'MBTI'; educationLevel: string; assessmentId: string; audience?: 'PARENT' | 'STUDENT' | 'PROFESSIONAL' | 'SELF' };
  executiveSummary: string;
  personalityAnalysis?: string;
  personalityProfile: PersonalityProfileInput & { confidenceOverall: number };
  naturalStrengths: string[];
  developmentAreas: string[];
  learningStyle?: { type: string; description: string; study_tips: string[] };
  parentTips?: string[];
  workStudyStyle: Record<string, string>;
  careerMatches: CareerMatch[];
  careerRoadmap: string[];
  suggestedSkills: string[];
  suggestedActivities: string[];
  careerRisksConsiderations: string;
  actionPlan: { day_30: string[]; day_60: string[]; day_90: string[] };
  disclaimer: string;
}

export const LEARNING_COLORS: Record<StudyApproach['key'], string> = {
  seeing: '#F5C400',
  listening: '#0A0A0A',
  reading: '#0EA5E9',
  doing: '#10B981',
};
const LEARNING_ICONS = { seeing: Eye, listening: Ear, reading: PenLine, doing: Hand } as const;

const STYLE_ROWS: { key: string; label: string; icon: typeof Lightbulb }[] = [
  { key: 'how_they_learn', label: 'Learning', icon: BookOpen },
  { key: 'how_they_solve_problems', label: 'Solving problems', icon: Puzzle },
  { key: 'how_they_communicate', label: 'Talking & sharing', icon: MessageCircle },
  { key: 'how_they_work_with_others', label: 'With friends & teams', icon: Users },
  { key: 'how_they_make_decisions', label: 'Making choices', icon: Scale },
];

const LEVEL_STYLES = {
  'Clear in answers': 'bg-[#F5C400] text-[#0A0A0A]',
  'Some signs': 'bg-[#FFF3B0] text-[#0A0A0A]',
  'Fewer signs': 'bg-muted text-muted-foreground',
} as const;

export function ReportView({ report, reportId, pdfHref }: { report: ReportJson; reportId: string; pdfHref?: string }) {
  const [copied, setCopied] = useState(false);
  const name = firstName(report.meta.studentName);
  const audience = normalizeAudience(report.meta.audience);
  const copy = audienceCopy(audience, name);

  const strengths = plainStrengths(report.personalityProfile);
  const approaches = studyApproaches(report.personalityProfile);
  const scales = everydayScales(report.personalityProfile);
  const areas = careerAreas(report.careerMatches);
  const studyHeadline = studyStartingPoint(approaches);

  return (
    <div className="relative overflow-hidden">
      <DotGridBackground className="pointer-events-none absolute inset-x-0 top-0 h-[420px] w-full text-muted-foreground/20" />
      <BlobAccent className="pointer-events-none absolute -right-24 -top-16 h-[320px] w-[320px] opacity-[0.06]" />
      <div className="relative z-10 mx-auto max-w-4xl px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {copy.kicker}
            </p>
            <h1 className="text-2xl font-bold">{name}&apos;s Strengths &amp; Learning Report</h1>
            <p className="text-sm text-muted-foreground">
              {report.meta.studentName} · {new Date(report.meta.assessmentDate).toDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              <LinkIcon className="h-4 w-4" aria-hidden /> {copied ? 'Copied — only you can open it' : 'Copy link'}
            </Button>
            <a href={pdfHref ?? `${BASE_PATH}/api/report/${reportId}/pdf`} className={buttonClasses({ size: 'sm' })}>
              <Download className="h-4 w-4" aria-hidden /> Download PDF
            </a>
          </div>
        </div>

        {/* At a glance infographic */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <GlanceTile icon={Sparkles} label="Came through most clearly" value={strengths[0]?.label ?? '—'} />
          <GlanceTile icon={BookOpen} label="Study ideas" value={studyHeadline} />
          <GlanceTile icon={Compass} label="Career area to explore first" value={areas[0]?.area ?? '—'} />
        </div>

        <p className="mt-4 flex gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{reportBasis(name)}</span>
        </p>

        <Card className="mt-6">
          <CardHeader><CardTitle>{name} in a nutshell</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{plainText(report.executiveSummary)}</p>
            {report.personalityAnalysis && (
              <p className="mt-3 text-sm text-muted-foreground">{plainText(report.personalityAnalysis)}</p>
            )}
          </CardContent>
        </Card>

        {/* Strengths */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>What came through in {name}&apos;s answers</CardTitle>
            <p className="text-xs text-muted-foreground">
              Longer bar = came through more clearly in what {name} said. These are self-described tendencies, not tested skills.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {strengths.map((s) => (
              <div key={s.label}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{s.label}</p>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${LEVEL_STYLES[s.level]}`}>{s.level}</span>
                </div>
                <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#0A0A0A] to-[#F5C400]" style={{ width: `${s.score}%` }} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{s.meaning}</p>
              </div>
            ))}
            {report.naturalStrengths.length > 0 && (
              <div className="rounded-lg border border-border bg-[#FFFBEA] p-4">
                <p className="mb-2 text-sm font-semibold">How this might show up day to day</p>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {plainList(report.naturalStrengths).map((s, i) => (
                    <li key={i} className="flex gap-2"><span className="text-[#C9A000]">★</span>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Study ideas — preferences to try, not a fixed learning style */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Study ideas to try</CardTitle>
            <p className="text-xs text-muted-foreground">{STUDY_NOTE}</p>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-2 sm:grid-cols-2">
              {approaches.map((a, i) => {
                const Icon = LEARNING_ICONS[a.key];
                return (
                  <li key={a.key} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: LEARNING_COLORS[a.key] }}>
                      <Icon className="h-4 w-4" color={a.key === 'seeing' ? '#0A0A0A' : '#FFFFFF'} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        <span className="text-muted-foreground">{i + 1}. </span>
                        {a.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{a.hint}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
            {report.learningStyle?.description && (
              <p className="mt-5 text-sm text-muted-foreground">{plainText(report.learningStyle.description)}</p>
            )}
            {report.learningStyle && report.learningStyle.study_tips.length > 0 && (
              <>
                <p className="mt-4 text-sm font-semibold">Tips worth trying</p>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {plainList(report.learningStyle.study_tips).map((tip, i) => (
                    <li key={i} className="flex gap-2 rounded-lg border border-border p-3 text-sm text-muted-foreground">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#C9A000]" aria-hidden />{tip}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        {/* Everyday style sliders */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{name}&apos;s everyday style</CardTitle>
            <p className="text-xs text-muted-foreground">Neither side is better — these simply show what comes most naturally.</p>
          </CardHeader>
          <CardContent className="space-y-5">
            {scales.map((s) => (
              <div key={s.left}>
                <div className="flex justify-between text-xs font-semibold">
                  <span>{s.left}</span>
                  <span>{s.right}</span>
                </div>
                <div className="relative mt-2 h-2.5 rounded-full bg-gradient-to-r from-muted via-[#FFF3B0] to-muted">
                  <span className="absolute left-1/2 top-0 h-full w-px bg-border" />
                  <span
                    className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[#0A0A0A] bg-[#F5C400] shadow"
                    style={{ left: `${Math.min(96, Math.max(4, s.value))}%` }}
                  />
                </div>
                <p className="mt-1.5 text-center text-xs text-muted-foreground">{s.summary}</p>
              </div>
            ))}
            <div className="grid gap-3 pt-2 sm:grid-cols-2">
              {STYLE_ROWS.filter((r) => report.workStudyStyle[r.key]).map(({ key, label, icon: Icon }) => (
                <div key={key} className="flex gap-3 rounded-lg bg-muted/50 p-3">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="text-sm text-muted-foreground">{plainText(report.workStudyStyle[key])}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Career map */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Careers worth exploring</CardTitle>
            <p className="text-xs text-muted-foreground">Each line joins a career to {name}. A thicker line means a closer fit with the answers given.</p>
          </CardHeader>
          <CardContent>
            <CareerMap name={name} matches={report.careerMatches} />
            <div className="mt-4 space-y-3">
              {report.careerMatches.map((c) => (
                <div key={c.careerId} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{c.title}</p>
                    <span className="rounded-full bg-[#F5C400] px-2.5 py-0.5 text-xs font-bold text-[#0A0A0A]">{fitLabel(c.matchScore)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.category}</p>
                  {c.reasoning?.whyItFits && <p className="mt-2 text-sm text-muted-foreground"><strong className="text-foreground">Why it was suggested:</strong> {plainText(c.reasoning.whyItFits)}</p>}
                  {c.skillGaps.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold">Skills to build:</span>
                      {c.skillGaps.map((g) => <span key={g} className="rounded-full border border-border px-2 py-0.5 text-[11px]">{g}</span>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold"><Info className="h-4 w-4" aria-hidden /> What these suggestions can and can&apos;t tell you</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  {suggestionLimitsFor(audience).map((l) => <li key={l}>{l}</li>)}
                </ul>
              </div>
              <div className="rounded-lg bg-[#FFFBEA] p-4">
                <p className="flex items-center gap-2 text-sm font-semibold"><Route className="h-4 w-4" aria-hidden /> How to explore a suggestion</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
                  {exploreStepsFor(audience).map((step) => <li key={step}>{step}</li>)}
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader><CardTitle>The journey ahead</CardTitle></CardHeader>
          <CardContent>
            <StepFlow steps={report.careerRoadmap.map((step) => ({ title: step }))} size="sm" />
          </CardContent>
        </Card>

        {/* Parent tips */}
        {(report.parentTips?.length ?? 0) > 0 && (
          <Card className="mt-6 border-[#F5C400] bg-[#FFFBEA]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Home className="h-5 w-5" /> {copy.tipsTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2">
                {plainList(report.parentTips).map((tip, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0A0A0A] text-xs font-bold text-white">{i + 1}</span>
                    <span className="pt-0.5">{tip}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Sprout className="h-5 w-5" /> Where {name} can grow</CardTitle></CardHeader>
            <CardContent><ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{plainList(report.developmentAreas).map((s, i) => <li key={i}>{s}</li>)}</ul></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Activities to try</CardTitle></CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{plainList(report.suggestedActivities).map((s, i) => <li key={i}>{s}</li>)}</ul>
              <p className="mt-3 text-xs font-semibold">Useful skills to build</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {plainList(report.suggestedSkills).map((s, i) => <span key={i} className="rounded-full border border-border px-3 py-1 text-xs">{s}</span>)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader><CardTitle>Next 3 months: a simple plan</CardTitle></CardHeader>
          <CardContent>
            <MilestoneTimeline className="mb-8" />
            <div className="grid gap-4 sm:grid-cols-3">
              {(['day_30', 'day_60', 'day_90'] as const).map((key, i) => (
                <div key={key}>
                  <p className="mb-2 text-sm font-semibold">{['This month', 'Next month', 'Month three'][i]}</p>
                  <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                    {plainList(report.actionPlan[key]).map((item, j) => <li key={j}>{item}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader><CardTitle>Good to keep in mind</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{plainText(report.careerRisksConsiderations)}</p></CardContent>
        </Card>

        <p className="mt-8 rounded-lg bg-muted/50 p-4 text-center text-xs text-muted-foreground">{copy.disclaimer}</p>
      </div>
    </div>
  );
}

function GlanceTile({ icon: Icon, label, value }: { icon: typeof Sparkles; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F5C400]">
        <Icon className="h-5 w-5 text-[#0A0A0A]" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm font-bold leading-snug">{value}</p>
      </div>
    </div>
  );
}
