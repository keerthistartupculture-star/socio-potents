'use client';

import { BASE_PATH } from '@/lib/basePath';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type Bucket = 'NEVER_STARTED' | 'STALLED_IN_PROGRESS' | 'REPORT_UNSEEN';

interface RecoveryItem {
  key: string;
  bucket: Bucket;
  userId: string;
  name: string;
  email: string;
  since: string;
  assessmentId?: string;
  reportId?: string;
}

// Matches the default in recoveryService.ts's RECOVERY_COOLDOWN_HOURS — purely descriptive
// text, not read from the server, so update both if the default ever changes.
const COOLDOWN_HOURS_LABEL = '48 hours (RECOVERY_COOLDOWN_HOURS)';

const BUCKET_META: Record<Bucket, { title: string; description: string }> = {
  NEVER_STARTED: {
    title: 'Registered, never started',
    description: 'Signed up more than a day ago and never began an assessment.',
  },
  STALLED_IN_PROGRESS: {
    title: 'Paused mid-assessment',
    description: 'In progress or paused, with no activity for 6+ hours.',
  },
  REPORT_UNSEEN: {
    title: 'Report ready, never opened',
    description: "Their report finished generating 2+ hours ago and they haven't viewed it.",
  },
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return 'less than an hour ago';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AdminRecoveryPage() {
  const [items, setItems] = useState<RecoveryItem[] | null>(null);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [sweeping, setSweeping] = useState(false);
  const [sweepResult, setSweepResult] = useState<string | null>(null);

  function load() {
    setError(null);
    fetch(BASE_PATH + '/api/admin/recovery')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setItems(data.items);
        setEmailConfigured(data.emailConfigured);
      })
      .catch(() => setError('Could not load recovery candidates.'));
  }

  useEffect(load, []);

  async function sendReminder(item: RecoveryItem) {
    setSending((s) => ({ ...s, [item.key]: true }));
    setResult((r) => ({ ...r, [item.key]: '' }));
    try {
      const res = await fetch(BASE_PATH + '/api/admin/recovery/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: item.userId,
          bucket: item.bucket,
          assessmentId: item.assessmentId,
          reportId: item.reportId,
        }),
      });
      const data = await res.json();
      setResult((r) => ({ ...r, [item.key]: data.sent ? 'Sent' : data.reason || 'Not sent' }));
    } catch {
      setResult((r) => ({ ...r, [item.key]: 'Failed to send' }));
    } finally {
      setSending((s) => ({ ...s, [item.key]: false }));
    }
  }

  const buckets: Bucket[] = ['STALLED_IN_PROGRESS', 'REPORT_UNSEEN', 'NEVER_STARTED'];

  async function runSweepNow() {
    setSweeping(true);
    setSweepResult(null);
    try {
      const res = await fetch(BASE_PATH + '/api/admin/recovery/sweep', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Sweep failed.');
      setSweepResult(
        `Scanned ${data.scanned} · sent ${data.notified} · skipped (recently reminded) ${data.skippedCooldown} · failed ${data.failed}`
      );
      load();
    } catch (err) {
      setSweepResult(err instanceof Error ? err.message : 'Sweep failed.');
    } finally {
      setSweeping(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Recovery</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
          <Button size="sm" disabled={sweeping} onClick={runSweepNow}>
            {sweeping ? 'Running...' : 'Run sweep now'}
          </Button>
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        Automatic sweeps notify everyone below at most once every {COOLDOWN_HOURS_LABEL}, and stop on their own
        once someone resolves the situation (starts, resumes, or opens their report). Schedule this to run on
        its own via an external scheduler hitting <code className="rounded bg-background px-1">POST /api/cron/recovery</code> with
        a <code className="rounded bg-background px-1">CRON_SECRET</code> — see .env.example. "Run sweep now" runs the
        exact same logic immediately, for testing.
        {sweepResult && <p className="mt-2 font-medium text-foreground">{sweepResult}</p>}
      </div>

      {!emailConfigured && items !== null && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          No email provider is configured, so reminders below are logged only — nothing is
          actually emailed yet. Set <code className="rounded bg-amber-100 px-1">RESEND_API_KEY</code> to
          start sending real emails, or use the mailto link on each row to reach out manually.
        </div>
      )}

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {items === null ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No stalled users right now.</CardContent></Card>
      ) : (
        <div className="space-y-8">
          {buckets.map((bucket) => {
            const rows = items.filter((i) => i.bucket === bucket);
            if (rows.length === 0) return null;
            return (
              <div key={bucket}>
                <h2 className="font-semibold">{BUCKET_META[bucket].title} <span className="ml-1 text-sm font-normal text-muted-foreground">({rows.length})</span></h2>
                <p className="mb-3 text-xs text-muted-foreground">{BUCKET_META[bucket].description}</p>
                <Card>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border text-left text-xs text-muted-foreground">
                        <tr>
                          <th className="p-3">Name</th>
                          <th className="p-3">Email</th>
                          <th className="p-3">Stalled since</th>
                          <th className="p-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((item) => (
                          <tr key={item.key} className="border-b border-border last:border-0 hover:bg-muted/50">
                            <td className="p-3">
                              <Link href={`/admin/users/${item.userId}`} className="font-medium hover:underline">{item.name}</Link>
                            </td>
                            <td className="p-3 text-muted-foreground">{item.email}</td>
                            <td className="p-3 text-muted-foreground">{timeAgo(item.since)}</td>
                            <td className="p-3">
                              <div className="flex items-center justify-end gap-2">
                                {result[item.key] && <span className="text-xs text-muted-foreground">{result[item.key]}</span>}
                                <a href={`mailto:${item.email}`}>
                                  <Button variant="outline" size="sm">Email directly</Button>
                                </a>
                                <Button size="sm" disabled={sending[item.key]} onClick={() => sendReminder(item)}>
                                  {sending[item.key] ? 'Sending...' : 'Send reminder'}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
