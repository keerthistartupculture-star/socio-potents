import { cn } from '@/lib/utils';

const STATS = [
  { value: '5–7 min', label: 'average session' },
  { value: '2', label: 'frameworks — Big Five & MBTI' },
  { value: '100%', label: 'chat-based, no forms' },
  { value: 'PDF', label: 'report, yours to keep' },
];

// Vertical divider only where a stat sits to the right of another — the right column on the
// 2-col mobile grid (index 1, 3), every column but the first once it becomes a 4-col row (sm+).
const DIVIDER_CLASSES = [
  '',
  'border-l border-border pl-4 sm:pl-6',
  'sm:border-l sm:border-border sm:pl-6',
  'border-l border-border pl-4 sm:pl-6',
];

export function TrustStrip() {
  return (
    <div className="border-y border-border bg-background">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-y-5 px-4 py-6 sm:grid-cols-4 sm:gap-y-0">
        {STATS.map((stat, i) => (
          <div key={stat.label} className={cn(DIVIDER_CLASSES[i])}>
            <p className="font-mono text-xl font-semibold tabular-nums text-foreground sm:text-2xl">{stat.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
