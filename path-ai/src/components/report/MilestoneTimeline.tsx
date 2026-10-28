// A 30/60/90-day milestone timeline: three fixed markers on a line that fills in
// black-to-yellow left to right, giving the action plan a visual sense of progression.
const MILESTONES = ['Day 30', 'Day 60', 'Day 90'];

export function MilestoneTimeline({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="relative flex items-center justify-between">
        <div aria-hidden="true" className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A] to-[#F5C400]" />
        {MILESTONES.map((label, i) => (
          <div key={label} className="relative z-10 flex flex-col items-center gap-2">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-[#0A0A0A] font-mono text-xs font-bold text-[#0A0A0A]"
              style={{ backgroundColor: i === MILESTONES.length - 1 ? '#F5C400' : '#FFFFFF' }}
            >
              {i + 1}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
