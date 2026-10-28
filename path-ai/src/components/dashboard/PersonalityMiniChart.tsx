'use client';

import { plainStrengths, type PersonalityProfileInput } from '@/lib/parentReport';

// Dashboard snapshot of the same plain-language strengths the report shows — never type codes or
// trait names from the scoring framework.
interface Props {
  framework: 'BIG_FIVE' | 'MBTI';
  bigFive: Record<string, { score: number }> | null;
  mbti: { scores: Record<string, { score: number }> } | null;
}

export function PersonalityMiniChart({ framework, bigFive, mbti }: Props) {
  if (!bigFive && !mbti) return <p className="text-sm text-muted-foreground">Scoring in progress...</p>;

  const strengths = plainStrengths({ framework, bigFive, mbti } as PersonalityProfileInput);
  return (
    <div className="space-y-3">
      {strengths.map((s) => (
        <div key={s.label}>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{s.label}</span>
            <span className="text-xs font-semibold text-muted-foreground">{s.level}</span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-gradient-to-r from-[#0A0A0A] to-[#F5C400]" style={{ width: `${s.score}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
