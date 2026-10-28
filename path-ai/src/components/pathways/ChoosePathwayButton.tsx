'use client';

import { BASE_PATH } from '@/lib/basePath';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export function ChoosePathwayButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose() {
    setBusy(true);
    setError(null);
    const res = await fetch(BASE_PATH + '/api/pathways', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug }) }).catch(() => null);
    if (res?.ok) {
      router.push(`/pathways/${slug}`);
      return;
    }
    setError('Could not start this pathway. Please try again.');
    setBusy(false);
  }

  return (
    <div>
      <Button size="sm" onClick={choose} disabled={busy}>{busy ? 'Starting…' : 'Choose this pathway'}</Button>
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
