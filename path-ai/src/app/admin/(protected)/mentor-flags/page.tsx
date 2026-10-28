'use client';

import { BASE_PATH } from '@/lib/basePath';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface FlagItem {
  id: string;
  flagReason: 'CRISIS' | 'HUMAN_REQUESTED' | 'OUTPUT_GUARD';
  message: string;
  reply: string | null;
  createdAt: string;
  reviewedAt: string | null;
  user: { id: string; name: string; email: string; educationLevel: string };
}

const REASON_META: Record<FlagItem['flagReason'], { label: string; className: string; help: string }> = {
  CRISIS: {
    label: 'Possible crisis',
    className: 'bg-red-100 text-red-800',
    help: 'Not sent to the AI; the student saw the fixed helpline reply. Follow your safeguarding process.',
  },
  HUMAN_REQUESTED: {
    label: 'Asked for a person',
    className: 'bg-amber-100 text-amber-800',
    help: 'The student asked to talk to a human.',
  },
  OUTPUT_GUARD: {
    label: 'AI reply cut',
    className: 'bg-muted text-muted-foreground',
    help: 'The AI reply contained a percentage, guarantee or pay figure; those sentences were removed.',
  },
};

export default function MentorFlagsPage() {
  const [items, setItems] = useState<FlagItem[] | null>(null);
  const [showReviewed, setShowReviewed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load(reviewed = showReviewed) {
    setError(null);
    fetch(`${BASE_PATH}/api/admin/mentor-flags${reviewed ? '?reviewed=1' : ''}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setItems(d.items))
      .catch(() => setError('Could not load flagged messages.'));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markReviewed(id: string) {
    const res = await fetch(`${BASE_PATH}/api/admin/mentor-flags/${id}`, { method: 'POST' });
    if (res.ok) setItems((list) => list?.filter((i) => i.id !== id) ?? null);
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold">Mentor review queue</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Mentor chat messages that need a person to look at them. Possible-crisis messages are listed first.
      </p>
      <div className="mt-4 flex gap-2">
        <Button size="sm" variant={showReviewed ? 'outline' : 'primary'} onClick={() => { setShowReviewed(false); load(false); }}>Open</Button>
        <Button size="sm" variant={showReviewed ? 'primary' : 'outline'} onClick={() => { setShowReviewed(true); load(true); }}>Reviewed</Button>
      </div>

      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      {items && items.length === 0 && <p className="mt-6 text-sm text-muted-foreground">Nothing here.</p>}

      <div className="mt-4 space-y-3">
        {items?.map((item) => {
          const meta = REASON_META[item.flagReason];
          return (
            <Card key={item.id}>
              <CardContent className="space-y-2 py-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.className}`}>{meta.label}</span>
                  <span className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground">{meta.help}</p>
                <p>
                  <Link href={`/admin/users/${item.user.id}`} className="font-medium underline">{item.user.name}</Link>{' '}
                  <span className="text-muted-foreground">· {item.user.educationLevel.replace('_', ' ')} · {item.user.email}</span>
                </p>
                <div className="rounded-md bg-muted/50 p-3">
                  <p className="text-xs font-semibold text-muted-foreground">Student wrote</p>
                  <p className="whitespace-pre-wrap">{item.message}</p>
                </div>
                {item.reply && (
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs font-semibold text-muted-foreground">Mentor replied</p>
                    <p className="whitespace-pre-wrap">{item.reply}</p>
                  </div>
                )}
                {!item.reviewedAt && (
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => markReviewed(item.id)}>Mark reviewed</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
