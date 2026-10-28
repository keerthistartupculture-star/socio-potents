'use client';

import { BASE_PATH } from '@/lib/basePath';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

interface QueueItem {
  id: string;
  task: string;
  taskCode: string;
  pathway: string;
  learner: string;
  educationLevel: string;
  round: number;
  submittedAt: string;
  hasAiDraft: boolean;
}

export default function SkillChecksQueuePage() {
  const [status, setStatus] = useState<'SUBMITTED' | 'MODERATED'>('SUBMITTED');
  const [items, setItems] = useState<QueueItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(null);
    fetch(`${BASE_PATH}/api/admin/skill-checks?status=${status}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setItems(d.items))
      .catch(() => setError('Could not load the queue (trainer, admin or super-admin role needed).'));
  }, [status]);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold">Skill-check marking</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Practical answers waiting for a trainer. Learners see nothing for a task until you confirm its marks.
      </p>
      <div className="mt-4 flex gap-2">
        <Button size="sm" variant={status === 'SUBMITTED' ? 'primary' : 'outline'} onClick={() => setStatus('SUBMITTED')}>To mark</Button>
        <Button size="sm" variant={status === 'MODERATED' ? 'primary' : 'outline'} onClick={() => setStatus('MODERATED')}>Marked</Button>
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      {items && items.length === 0 && <p className="mt-6 text-sm text-muted-foreground">Nothing here.</p>}
      {items && items.length > 0 && (
        <table className="mt-4 w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="py-2">Learner</th>
              <th>Task</th>
              <th>Check</th>
              <th>Submitted</th>
              <th>AI draft</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-t border-border">
                <td className="py-2">
                  {i.learner}
                  <span className="block text-xs text-muted-foreground">{i.educationLevel.replace('_', ' ')}</span>
                </td>
                <td>
                  {i.task}
                  <span className="block text-xs text-muted-foreground">{i.pathway} · {i.taskCode}</span>
                </td>
                <td>{i.round === 1 ? 'First' : 'Reassessment'}</td>
                <td>{new Date(i.submittedAt).toLocaleString()}</td>
                <td>{i.hasAiDraft ? 'Yes' : '—'}</td>
                <td>
                  <Link href={`/admin/skill-checks/${i.id}`} className="font-medium underline">{status === 'SUBMITTED' ? 'Mark' : 'View'}</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
