// Illustrated side-by-side comparison of the two personality frameworks PATH AI uses —
// fills the "which test do I take" question with a glance-able infographic instead of prose.
import { School, GraduationCap } from 'lucide-react';

const BIG_FIVE = ['Openness', 'Conscientiousness', 'Extraversion', 'Agreeableness', 'Stability'];
const MBTI_AXES = ['Introversion / Extraversion', 'Sensing / Intuition', 'Thinking / Feeling', 'Judging / Perceiving'];

export function FrameworkCompare({ accentColor = '#F5C400' }: { accentColor?: string }) {
  return (
    <div className="grid overflow-hidden rounded-xl border border-border sm:grid-cols-2">
      <div className="flex flex-col gap-4 border-b border-border p-6 sm:border-b-0 sm:border-r">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-[#0A0A0A]" style={{ backgroundColor: accentColor }}>
            <School className="h-5 w-5 text-[#0A0A0A]" strokeWidth={2.25} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Class 10</p>
            <p className="font-semibold">Big Five</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Five broad traits, explored through story-based scenarios rather than direct questions.</p>
        <div className="flex flex-wrap gap-2">
          {BIG_FIVE.map((t) => (
            <span key={t} className="rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-foreground">{t}</span>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-[#0A0A0A]" style={{ backgroundColor: accentColor }}>
            <GraduationCap className="h-5 w-5 text-[#0A0A0A]" strokeWidth={2.25} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Class 12, college &amp; professionals</p>
            <p className="font-semibold">MBTI</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Four axes, combined into a type, used to rank career matches.</p>
        <div className="flex flex-wrap gap-2">
          {MBTI_AXES.map((t) => (
            <span key={t} className="rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-foreground">{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
