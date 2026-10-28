// Illustrated step/flow infographic: icon nodes connected by a hand-drawn-style dashed
// wave, in the PATH AI yellow/black/white palette. Desktop lays nodes out horizontally
// with the wave running behind them; narrow screens fall back to a vertical timeline.
import type { LucideIcon } from 'lucide-react';

interface Step {
  title: string;
  desc?: string;
  icon?: LucideIcon;
}

const SIZES = {
  default: { node: 56, icon: 24, badge: 20 },
  sm: { node: 44, icon: 19, badge: 17 },
} as const;

export function StepFlow({
  steps,
  accentColor = '#F5C400',
  size = 'default',
}: {
  steps: Step[];
  accentColor?: string;
  size?: keyof typeof SIZES;
}) {
  const { node, icon, badge } = SIZES[size];
  const amp = Math.round(node * 0.2);

  return (
    <div className="relative">
      {/* Desktop: wavy connector running behind the node row */}
      <svg
        viewBox={`0 0 1000 ${node}`}
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 top-0 hidden md:block"
        style={{ height: node }}
        aria-hidden="true"
      >
        <path
          d={`M0 ${node / 2} Q 125 ${node / 2 - amp} 250 ${node / 2} T 500 ${node / 2} T 750 ${node / 2} T 1000 ${node / 2}`}
          fill="none"
          stroke={accentColor}
          strokeWidth="2.5"
          strokeDasharray="1 13"
          strokeLinecap="round"
          opacity="0.85"
        />
      </svg>

      <div className="relative flex flex-col gap-6 md:flex-row md:gap-2">
        {steps.map((step, i) => (
          <div key={step.title} className="relative flex gap-4 md:flex-1 md:flex-col md:items-center md:gap-3 md:text-center">
            {/* Mobile vertical connector */}
            {i < steps.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute w-px bg-[repeating-linear-gradient(180deg,var(--connector-color)_0_7px,transparent_7px_13px)] md:hidden"
                style={{ left: node / 2 - 0.5, top: node, bottom: -24, ['--connector-color' as string]: accentColor }}
              />
            )}
            <div
              className="relative z-10 flex shrink-0 items-center justify-center rounded-full border-[3px] border-[#0A0A0A] shadow-sm"
              style={{ width: node, height: node, backgroundColor: accentColor }}
            >
              {step.icon ? (
                <>
                  <step.icon width={icon} height={icon} color="#0A0A0A" strokeWidth={2.25} />
                  <span
                    className="absolute -right-1 -top-1 flex items-center justify-center rounded-full border-2 font-mono font-bold text-white"
                    style={{ width: badge, height: badge, fontSize: badge * 0.5, borderColor: accentColor, backgroundColor: '#0A0A0A' }}
                  >
                    {i + 1}
                  </span>
                </>
              ) : (
                <span className="font-mono font-bold text-[#0A0A0A]" style={{ fontSize: node * 0.36 }}>
                  {i + 1}
                </span>
              )}
            </div>
            <div className="pt-0.5 md:pt-0">
              <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
              {step.desc && <p className="mt-1 text-xs leading-relaxed text-muted-foreground md:mx-auto md:max-w-[180px]">{step.desc}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
