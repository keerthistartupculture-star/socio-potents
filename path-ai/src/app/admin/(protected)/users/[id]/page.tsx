'use client';

import { BASE_PATH } from '@/lib/basePath';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  function reload() {
    fetch(`${BASE_PATH}/api/admin/users/${params.id}`).then((r) => r.json()).then(setData);
  }

  useEffect(reload, [params.id]);

  async function submitNote() {
    if (!note.trim()) return;
    setSavingNote(true);
    await fetch(`${BASE_PATH}/api/admin/users/${params.id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    setNote('');
    setSavingNote(false);
    reload();
  }

  if (!data) return <p className="text-muted-foreground">Loading...</p>;
  const { user } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{user.name}</h1>
        <p className="text-muted-foreground">{user.email} · {user.educationLevel.replace('_', ' ')}</p>
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {user.assessments.map((a: any) => (
        <Card key={a.id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>{a.framework === 'BIG_FIVE' ? 'Big Five' : 'MBTI'} — {new Date(a.createdAt).toLocaleDateString()}</span>
              <span className="text-xs font-normal text-muted-foreground">{a.status.replace('_', ' ')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {a.personalityScore && (
              <p className="text-sm">
                Result: <strong>{a.personalityScore.mbtiType ?? 'Big Five profile'}</strong> (confidence {Math.round(a.personalityScore.confidenceOverall * 100)}%)
              </p>
            )}
            {a.report && (
              <a href={`${BASE_PATH}/api/report/${a.report.id}/pdf`} className="text-sm text-primary hover:underline">Download PDF report</a>
            )}
            <details>
              <summary className="cursor-pointer text-sm font-medium">Transcript ({a.responses.length} responses)</summary>
              <div className="mt-2 space-y-2">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {a.responses.map((r: any) => (
                  <div key={r.id} className="rounded-lg border border-border p-3 text-sm">
                    <p className="text-muted-foreground">{r.questionTextSnapshot}</p>
                    <p className="mt-1 font-medium">{r.responseText}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{r.inputMethod} · confidence {Math.round(r.confidence * 100)}%</p>
                  </div>
                ))}
              </div>
            </details>
            {a.recommendations.length > 0 && (
              <details>
                <summary className="cursor-pointer text-sm font-medium">Career recommendations</summary>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {a.recommendations.map((r: any) => (
                    <div key={r.id} className="rounded-lg border border-border p-2 text-sm">
                      {r.career.title} — {Math.round(r.matchScore)}%
                    </div>
                  ))}
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader><CardTitle>Counselor Notes</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {user.counselorNotes.map((n: any) => (
            <div key={n.id} className="rounded-lg border border-border p-3 text-sm">
              <p>{n.note}</p>
              <p className="mt-1 text-xs text-muted-foreground">{n.counselor.name} · {new Date(n.createdAt).toLocaleString()}</p>
            </div>
          ))}
          <Textarea rows={3} placeholder="Add a note..." value={note} onChange={(e) => setNote(e.target.value)} />
          <Button size="sm" disabled={savingNote} onClick={submitNote}>{savingNote ? 'Saving...' : 'Add note'}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
