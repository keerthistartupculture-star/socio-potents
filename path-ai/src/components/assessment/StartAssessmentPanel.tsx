'use client';

import { BASE_PATH } from '@/lib/basePath';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DotGridBackground, BlobAccent, PathLines } from '@/components/marketing/BackgroundVectors';

export function StartAssessmentPanel({
  userName,
  framework,
  isMinor,
  demoModeEnabled,
  openAttempt,
}: {
  userName: string;
  framework: 'BIG_FIVE' | 'MBTI';
  isMinor: boolean;
  demoModeEnabled: boolean;
  openAttempt: { id: string; answered: number } | null;
}) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(isDemo: boolean) {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch(BASE_PATH + '/api/assessment/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDemo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not start the assessment.');
        setStarting(false);
        return;
      }
      router.push(`/assessment/session/${data.assessmentId}`);
    } catch {
      setError('Network error. Please try again.');
      setStarting(false);
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <DotGridBackground className="absolute inset-0 h-full w-full text-muted-foreground/25" />
      <PathLines className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.08]" />
      <BlobAccent className="pointer-events-none absolute -right-32 -top-32 h-[420px] w-[420px] opacity-[0.1]" />
      <BlobAccent flip className="pointer-events-none absolute -bottom-32 -left-24 h-[340px] w-[340px] opacity-[0.08]" />
      <div className="relative z-10 mx-auto max-w-2xl px-4 py-14">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Hi {userName.split(' ')[0]}, ready to begin?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-muted-foreground">
            You will take the <strong>{framework === 'BIG_FIVE' ? 'Big Five' : 'MBTI-style'}</strong> assessment
            through a natural chat conversation of about 15-20 short questions (roughly 10 minutes). Every
            answer is saved as soon as you send it, so you can leave and continue later. At the end you review
            your answers and press <strong>Submit</strong> to get your report.
          </p>

          <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm">
            <p className="font-medium">Before you start</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>There are no right or wrong answers — answer as naturally as you can.</li>
              <li>This assessment is for career exploration, not a psychological diagnosis.</li>
              {isMinor && <li>A parent/guardian has already provided consent for this assessment.</li>}
            </ul>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button className="flex-1" size="lg" disabled={starting} onClick={() => start(false)}>
              {starting ? 'Opening...' : openAttempt ? `Continue where you left off (${openAttempt.answered} answered)` : 'Begin Assessment'}
            </Button>
            {demoModeEnabled && (
              <Button className="flex-1" size="lg" variant="outline" disabled={starting} onClick={() => start(true)}>
                Try Demo Mode
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
