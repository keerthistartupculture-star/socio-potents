'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

// A "boarding pass"-style preview of a live session — a chat snippet plus a Big Five / MBTI
// toggle showing sample scored output. Purely illustrative marketing content (fixed sample
// values, not a real session) that replaces the old static hero illustration with something
// that demonstrates what the product actually does.

const BIG_FIVE = [
  { name: 'Openness', value: 82 },
  { name: 'Conscient.', value: 64 },
  { name: 'Extraversion', value: 47 },
  { name: 'Agreeable.', value: 71 },
  { name: 'Stability', value: 58 },
];

const DICHOTOMIES = [
  { left: 'E', right: 'I', percent: 22 },
  { left: 'S', right: 'N', percent: 68 },
  { left: 'T', right: 'F', percent: 38 },
  { left: 'J', right: 'P', percent: 60 },
];

export function PersonalitySnapshotCard({ className }: { className?: string }) {
  const [view, setView] = useState<'bigfive' | 'mbti'>('bigfive');

  return (
    <div className={cn('mx-auto w-full max-w-md rounded-md border border-border bg-card shadow-sm', className)}>
      <div className="px-5 pb-4 pt-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            PATH AI <b className="text-foreground">· LIVE SESSION</b>
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
            <i className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground motion-reduce:animate-none" />
            in progress
          </span>
        </div>
        <div className="mb-2 max-w-[88%] rounded-xl rounded-bl-sm bg-muted px-3.5 py-2.5 text-sm leading-snug text-foreground">
          Your teacher gives an assignment with no fixed format — you can present it however you like. What do you do?
        </div>
        <div className="ml-auto max-w-[88%] rounded-xl rounded-br-sm bg-primary px-3.5 py-2.5 text-sm leading-snug text-primary-foreground">
          I'd sketch a few directions first, then run with whichever one feels most interesting to explore.
        </div>
      </div>

      <div className="relative border-t border-dashed border-border">
        <span className="absolute -left-[9px] -top-[9px] h-[18px] w-[18px] rounded-full bg-background" />
        <span className="absolute -right-[9px] -top-[9px] h-[18px] w-[18px] rounded-full bg-background" />
      </div>

      <div className="px-5 pb-5 pt-4">
        <div role="tablist" aria-label="Personality framework preview" className="mb-4 flex gap-1 rounded bg-muted p-0.5">
          <button
            role="tab"
            aria-selected={view === 'bigfive'}
            onClick={() => setView('bigfive')}
            className={cn(
              'flex-1 rounded-sm py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide transition-colors active:scale-95',
              view === 'bigfive' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            )}
          >
            Big Five
          </button>
          <button
            role="tab"
            aria-selected={view === 'mbti'}
            onClick={() => setView('mbti')}
            className={cn(
              'flex-1 rounded-sm py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide transition-colors active:scale-95',
              view === 'mbti' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            )}
          >
            MBTI
          </button>
        </div>

        {view === 'bigfive' ? (
          <div className="space-y-2">
            {BIG_FIVE.map((trait) => (
              <div key={trait.name} className="flex items-center gap-2.5">
                <span className="w-[70px] shrink-0 text-xs text-muted-foreground">{trait.name}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${trait.value}%` }} />
                </span>
                <span className="w-6 shrink-0 text-right font-mono text-xs font-semibold text-foreground">{trait.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <div className="mb-3 flex justify-center gap-2">
              {['I', 'N', 'F', 'J'].map((letter) => (
                <span
                  key={letter}
                  className="flex h-12 w-11 items-center justify-center rounded border border-border font-serif text-2xl font-semibold text-foreground"
                >
                  {letter}
                </span>
              ))}
            </div>
            <p className="mb-3 text-center font-mono text-xs text-muted-foreground">confidence 74%</p>
            <div className="space-y-2">
              {DICHOTOMIES.map((d) => (
                <div key={d.left + d.right} className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                  <span className="w-3.5 text-center font-semibold text-foreground">{d.left}</span>
                  <span className="relative h-[5px] flex-1 rounded-full bg-muted">
                    <span
                      className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground"
                      style={{ left: `${d.percent}%` }}
                    />
                  </span>
                  <span className="w-3.5 text-center font-semibold text-foreground">{d.right}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
