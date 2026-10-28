'use client';

import { BASE_PATH } from '@/lib/basePath';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock, XCircle, Info, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { LEVEL_LABELS } from '@/config/pathways/digitalMarketingEntry';
import { progress, strengthsAndGaps, type CriterionMark, type SkillResult } from '@/lib/skillProfile';

interface Skill {
  code: string;
  name: string;
  description: string;
  levelDescriptors: { level: 1 | 2 | 3 | 4; label: string; descriptor: string }[];
  learningSuggestions: { kind: 'LEARN' | 'PROJECT'; text: string }[];
}

interface Task {
  id: string;
  kind: 'PRACTICAL' | 'KNOWLEDGE';
  title: string;
  brief: string;
  options?: string[];
  criteria?: string[];
  attempt: null | {
    status: 'SUBMITTED' | 'MODERATED' | 'AUTO_MARKED';
    response: string;
    isCorrect?: boolean;
    correctOption?: string;
    finalMarks?: Record<string, CriterionMark>;
    trainerNote?: string | null;
    rubric?: { id: string; criterion: string }[];
  };
}

interface View {
  pathway: { slug: string; title: string; roleLevel: string; description: string; contentStatus: string };
  skills: Skill[];
  enrolled: boolean;
  round: number;
  tasks: Task[];
  roundComplete: boolean;
  canReassess: boolean;
  results: { first: SkillResult[]; second: SkillResult[] | null };
}

const levelLabel = (l: number | null) => (l ? LEVEL_LABELS[l as 1 | 2 | 3 | 4] : 'Waiting for trainer');

export function PathwayClient({ slug }: { slug: string }) {
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`${BASE_PATH}/api/pathways/${slug}`, { cache: 'no-store' }).catch(() => null);
    if (!res?.ok) {
      setError('Could not load this pathway. Please refresh.');
      return;
    }
    setView(await res.json());
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <p role="alert" className="mx-auto max-w-3xl px-4 py-10 text-destructive">{error}</p>;
  if (!view) return <p className="mx-auto max-w-3xl px-4 py-10 text-muted-foreground">Loading…</p>;
  if (!view.enrolled) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p>You haven&apos;t chosen this pathway yet.</p>
        <Link href="/pathways" className="underline">See pathways</Link>
      </div>
    );
  }

  const skillName = (code: string) => view.skills.find((s) => s.code === code)?.name ?? code;
  const current = view.round >= 2 && view.results.second ? view.results.second : view.results.first;
  const { strengths, gaps, notYetMarked } = strengthsAndGaps(current);
  const done = view.tasks.filter((t) => t.attempt).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm text-muted-foreground"><Link href="/pathways" className="underline">Pathways</Link> / {view.pathway.title}</p>
      <h1 className="mt-1 text-3xl font-bold">{view.pathway.title}</h1>
      <p className="text-sm text-muted-foreground">{view.pathway.roleLevel}</p>

      {view.pathway.contentStatus !== 'TRAINER_REVIEWED' && (
        <p className="mt-4 flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Pilot pathway: the tasks and marking criteria are a draft that trainers are still reviewing, so they may change.
        </p>
      )}
      <p className="mt-3 flex gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        Results show the skill level you showed on these tasks, with the evidence behind each mark. They are not a job-readiness
        score, and doing well here does not mean an employer will hire you — employers use their own criteria.
      </p>

      <h2 className="mt-8 text-xl font-semibold">
        {view.round >= 2 ? 'Reassessment (new tasks, same skills)' : 'First skill check'} · {done} of {view.tasks.length} done
      </h2>
      <div className="mt-4 space-y-4">
        {view.tasks.map((t) => (
          <TaskCard key={t.id} task={t} slug={slug} onDone={load} />
        ))}
      </div>

      <h2 className="mt-10 text-xl font-semibold">Your results</h2>
      <p className="text-sm text-muted-foreground">
        Practical tasks are marked by a trainer against the criteria shown. Results appear here once they are marked.
      </p>
      <div className="mt-4 space-y-3">
        {current.map((r) => {
          const skill = view.skills.find((s) => s.code === r.skillCode);
          const descriptor = skill?.levelDescriptors.find((d) => d.level === r.level)?.descriptor;
          return (
            <Card key={r.skillCode}>
              <CardContent className="space-y-2 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{skill?.name}</p>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.level ? 'bg-[#FFF3B0] text-[#0A0A0A]' : 'bg-muted text-muted-foreground'}`}>
                    {levelLabel(r.level)}
                  </span>
                </div>
                {descriptor && <p className="text-sm text-muted-foreground">{descriptor}</p>}
                {r.knowledge.total > 0 && (
                  <p className="text-xs text-muted-foreground">Knowledge questions: {r.knowledge.correct} of {r.knowledge.total} correct</p>
                )}
                {r.evidence.length > 0 && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-xs font-medium">Evidence behind this level ({r.evidence.length} marks)</summary>
                    <ul className="mt-2 space-y-2">
                      {r.evidence.map((e, i) => (
                        <li key={i} className="rounded-md border border-border p-2 text-xs">
                          <p className="font-medium">{e.taskTitle} — {e.criterion}: {LEVEL_LABELS[e.level]}</p>
                          {e.evidence && <p className="mt-1 italic">“{e.evidence}”</p>}
                          {e.feedback && <p className="mt-1 text-muted-foreground">{e.feedback}</p>}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(strengths.length > 0 || gaps.length > 0) && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Strengths shown</CardTitle></CardHeader>
            <CardContent>
              {strengths.length ? (
                <ul className="list-disc space-y-1 pl-5 text-sm">{strengths.map((s) => <li key={s.skillCode}>{skillName(s.skillCode)}</li>)}</ul>
              ) : (
                <p className="text-sm text-muted-foreground">None marked Secure or Strong yet.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Skills to build next</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {gaps.length === 0 && <p className="text-sm text-muted-foreground">No gaps marked so far.</p>}
              {gaps.map((g) => (
                <div key={g.skillCode}>
                  <p className="text-sm font-medium">{skillName(g.skillCode)}</p>
                  <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                    {view.skills
                      .find((s) => s.code === g.skillCode)
                      ?.learningSuggestions.map((l, i) => (
                        <li key={i}><strong>{l.kind === 'PROJECT' ? 'Small project:' : 'Learn:'}</strong> {l.text}</li>
                      ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
      {notYetMarked.length > 0 && done > 0 && (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" aria-hidden /> Some skills are still waiting for a trainer to mark them.</p>
      )}

      {view.results.second && (
        <Card className="mt-6">
          <CardHeader><CardTitle className="text-base">Progress since your first check</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {progress(view.results.first, view.results.second).map((p) => (
                <li key={p.skillCode} className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{skillName(p.skillCode)}:</span>
                  <span>{levelLabel(p.from)}</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  <span>{levelLabel(p.to)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {view.canReassess && <ReassessButton slug={slug} onDone={load} />}
    </div>
  );
}

function TaskCard({ task, slug, onDone }: { task: Task; slug: string; onDone: () => Promise<void> }) {
  const [text, setText] = useState('');
  const [choice, setChoice] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const a = task.attempt;

  async function submit() {
    setBusy(true);
    setError(null);
    const response = task.kind === 'KNOWLEDGE' ? String(choice) : text;
    const res = await fetch(`${BASE_PATH}/api/pathways/${slug}/attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: task.id, response }),
    }).catch(() => null);
    if (res?.ok) {
      await onDone();
    } else {
      const data = await res?.json().catch(() => ({}));
      setError(data?.error ?? 'Your answer was not saved. Please try again.');
    }
    setBusy(false);
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold">{task.kind === 'KNOWLEDGE' ? 'Quick question' : task.title}</p>
          {a && <StatusPill attempt={a} />}
        </div>
        <p className="whitespace-pre-wrap text-sm">{task.brief}</p>

        {task.kind === 'PRACTICAL' && !a && (
          <>
            {task.criteria && <p className="text-xs text-muted-foreground">Marked on: {task.criteria.join(' · ')}</p>}
            <label htmlFor={`t-${task.id}`} className="sr-only">Your answer</label>
            <Textarea id={`t-${task.id}`} rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write your answer…" />
            <Button size="sm" onClick={submit} disabled={busy || text.trim().length < 20}>{busy ? 'Submitting…' : 'Submit for marking'}</Button>
          </>
        )}

        {task.kind === 'KNOWLEDGE' && !a && (
          <fieldset className="space-y-2">
            <legend className="sr-only">{task.title}</legend>
            {task.options?.map((o, i) => (
              <label key={i} className="flex items-start gap-2 text-sm">
                <input type="radio" name={`q-${task.id}`} className="mt-1" checked={choice === i} onChange={() => setChoice(i)} />
                {o}
              </label>
            ))}
            <Button size="sm" onClick={submit} disabled={busy || choice === null}>{busy ? 'Checking…' : 'Check answer'}</Button>
          </fieldset>
        )}

        {a && task.kind === 'PRACTICAL' && (
          <div className="space-y-2">
            <details className="text-sm">
              <summary className="cursor-pointer text-xs font-medium">Your answer</summary>
              <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted/40 p-2">{a.response}</p>
            </details>
            {a.status === 'SUBMITTED' && <p className="text-xs text-muted-foreground">Submitted — a trainer will mark this against the criteria.</p>}
            {a.status === 'MODERATED' && a.rubric && a.finalMarks && (
              <ul className="space-y-2">
                {a.rubric.map((c) => {
                  const m = a.finalMarks![c.id];
                  return (
                    <li key={c.id} className="rounded-md border border-border p-2 text-xs">
                      <p className="font-medium">{c.criterion}: {m ? LEVEL_LABELS[m.level] : '—'}</p>
                      {m?.evidence && <p className="mt-1 italic">“{m.evidence}”</p>}
                      {m?.feedback && <p className="mt-1 text-muted-foreground">{m.feedback}</p>}
                    </li>
                  );
                })}
                {a.trainerNote && <li className="text-xs"><strong>Trainer note:</strong> {a.trainerNote}</li>}
              </ul>
            )}
          </div>
        )}

        {a && task.kind === 'KNOWLEDGE' && (
          <p className="text-sm">
            {a.isCorrect ? 'Correct.' : <>Not quite — the answer is: <strong>{a.correctOption}</strong></>}
          </p>
        )}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

function StatusPill({ attempt }: { attempt: NonNullable<Task['attempt']> }) {
  if (attempt.status === 'SUBMITTED') {
    return <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium"><Clock className="h-3 w-3" aria-hidden /> Waiting for trainer</span>;
  }
  if (attempt.status === 'AUTO_MARKED') {
    return attempt.isCorrect ? (
      <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800"><CheckCircle2 className="h-3 w-3" aria-hidden /> Correct</span>
    ) : (
      <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium"><XCircle className="h-3 w-3" aria-hidden /> Not quite</span>
    );
  }
  return <span className="flex items-center gap-1 rounded-full bg-[#FFF3B0] px-2.5 py-0.5 text-xs font-medium"><CheckCircle2 className="h-3 w-3" aria-hidden /> Marked</span>;
}

function ReassessButton({ slug, onDone }: { slug: string; onDone: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <Card className="mt-6 border-[#F5C400]">
      <CardContent className="space-y-2 py-4">
        <p className="font-semibold">Ready to check your progress?</p>
        <p className="text-sm text-muted-foreground">
          Work on the skills above first. The reassessment uses new tasks of the same kind and difficulty, so you can see how
          your level has changed.
        </p>
        <Button
          size="sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await fetch(`${BASE_PATH}/api/pathways/${slug}/reassess`, { method: 'POST' }).catch(() => null);
            await onDone();
            setBusy(false);
          }}
        >
          Start reassessment
        </Button>
      </CardContent>
    </Card>
  );
}
