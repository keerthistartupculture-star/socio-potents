'use client';

import { BASE_PATH } from '@/lib/basePath';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';

type Level = 1 | 2 | 3 | 4;
interface Criterion {
  id: string;
  criterion: string;
  skillCode: string;
  levels: { level: Level; descriptor: string }[];
}
interface Mark {
  level: Level;
  evidence?: string;
  feedback?: string;
  evidenceVerified?: boolean;
}
interface Attempt {
  id: string;
  status: string;
  round: number;
  learner: string;
  task: { title: string; brief: string; rubric: Criterion[] };
  response: string;
  aiDraft: Record<string, Mark> | null;
  finalMarks: Record<string, Mark> | null;
  trainerNote: string | null;
}
type Draft = { level?: Level; evidence: string; feedback: string };

const LABELS: Record<Level, string> = { 1: 'Emerging', 2: 'Developing', 3: 'Secure', 4: 'Strong' };

export default function ModerateAttemptPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [a, setA] = useState<Attempt | null>(null);
  const [marks, setMarks] = useState<Record<string, Draft>>({});
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${BASE_PATH}/api/admin/skill-checks/${params.id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Attempt) => {
        setA(d);
        // Start from the trainer's own previous marks, if any. AI suggestions are deliberately NOT
        // pre-filled: the trainer decides each level, with the suggestion shown alongside.
        const start: Record<string, Draft> = {};
        for (const c of d.task.rubric) {
          const m = d.finalMarks?.[c.id];
          start[c.id] = { level: m?.level, evidence: m?.evidence ?? '', feedback: m?.feedback ?? '' };
        }
        setMarks(start);
        setNote(d.trainerNote ?? '');
      })
      .catch(() => setError('Could not load this answer.'));
  }, [params.id]);

  function set(id: string, patch: Partial<Draft>) {
    setMarks((m) => ({ ...m, [id]: { ...m[id], ...patch } }));
  }

  async function save() {
    if (!a) return;
    const missing = a.task.rubric.filter((c) => !marks[c.id]?.level || (marks[c.id]?.feedback ?? '').trim().length < 3);
    if (missing.length) {
      setError(`Choose a level and write feedback for: ${missing.map((c) => c.criterion).join(', ')}`);
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch(`${BASE_PATH}/api/admin/skill-checks/${a.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marks, trainerNote: note || undefined }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setSaving(false);
    if (res?.ok) router.push('/admin/skill-checks');
    else setError(data?.error ?? 'Could not save the marks.');
  }

  if (error && !a) return <p role="alert" className="text-sm text-destructive">{error}</p>;
  if (!a) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="max-w-4xl space-y-5">
      <p className="text-sm">
        <Link href="/admin/skill-checks" className="underline">Skill-check marking</Link> / {a.task.title}
      </p>
      <div>
        <h1 className="text-2xl font-bold">{a.task.title}</h1>
        <p className="text-sm text-muted-foreground">{a.learner} · {a.round === 1 ? 'First check' : 'Reassessment'}</p>
      </div>
      <div className="rounded-lg bg-muted/40 p-3 text-sm">
        <p className="text-xs font-semibold text-muted-foreground">Task</p>
        <p className="whitespace-pre-wrap">{a.task.brief}</p>
      </div>
      <div className="rounded-lg border border-border p-3 text-sm">
        <p className="text-xs font-semibold text-muted-foreground">Learner&apos;s answer</p>
        <p className="whitespace-pre-wrap">{a.response}</p>
      </div>
      {!a.aiDraft && <p className="text-xs text-muted-foreground">No AI suggestion for this answer — mark from the criteria.</p>}

      {a.task.rubric.map((c) => {
        const draft = a.aiDraft?.[c.id];
        const m = marks[c.id] ?? { evidence: '', feedback: '' };
        return (
          <fieldset key={c.id} className="space-y-2 rounded-lg border border-border p-4">
            <legend className="px-1 text-sm font-semibold">{c.criterion}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {c.levels.map((l) => (
                <label
                  key={l.level}
                  className={`flex cursor-pointer gap-2 rounded-md border p-2 text-xs ${m.level === l.level ? 'border-[#C9A000] bg-[#FFFBEA]' : 'border-border'}`}
                >
                  <input type="radio" name={`lvl-${c.id}`} checked={m.level === l.level} onChange={() => set(c.id, { level: l.level })} />
                  <span>
                    <strong>{l.level} · {LABELS[l.level]}</strong> — {l.descriptor}
                  </span>
                </label>
              ))}
            </div>
            {draft && (
              <div className="rounded-md bg-muted/50 p-2 text-xs">
                <p>
                  <strong>AI suggestion (check it):</strong> {draft.level} · {LABELS[draft.level]}
                </p>
                {draft.evidence ? <p className="italic">“{draft.evidence}”</p> : <p className="text-muted-foreground">No verified quote from the answer.</p>}
                {draft.feedback && <p>{draft.feedback}</p>}
                <button
                  type="button"
                  className="mt-1 underline"
                  onClick={() => set(c.id, { level: draft.level, evidence: draft.evidence ?? '', feedback: draft.feedback ?? '' })}
                >
                  Use as a starting point
                </button>
              </div>
            )}
            <label className="block text-xs font-medium" htmlFor={`ev-${c.id}`}>Evidence (copy a short quote from the answer — optional)</label>
            <Textarea id={`ev-${c.id}`} rows={2} value={m.evidence} onChange={(e) => set(c.id, { evidence: e.target.value })} />
            <label className="block text-xs font-medium" htmlFor={`fb-${c.id}`}>Feedback for the learner (required)</label>
            <Textarea id={`fb-${c.id}`} rows={2} value={m.feedback} onChange={(e) => set(c.id, { feedback: e.target.value })} />
          </fieldset>
        );
      })}

      <div>
        <label className="block text-xs font-medium" htmlFor="note">Overall note (optional)</label>
        <Textarea id="note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : a.status === 'MODERATED' ? 'Update marks' : 'Confirm marks'}</Button>
    </div>
  );
}
