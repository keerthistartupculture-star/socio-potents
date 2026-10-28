// Subtle decorative background vectors — dot grids, compass-path lines, and soft blob
// accents in the PATH AI palette. Always absolutely positioned, low-opacity, and
// pointer-events-none so they add texture without competing with real content.

export function DotGridBackground({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      preserveAspectRatio="none"
    >
      <defs>
        <pattern id="path-ai-dot-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.4" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#path-ai-dot-grid)" />
    </svg>
  );
}

/** A soft, blurred yellow blob for corner accents — pass `flip` to mirror horizontally. */
export function BlobAccent({ className, color = '#F5C400', flip = false }: { className?: string; color?: string; flip?: boolean }) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      viewBox="0 0 600 600"
      xmlns="http://www.w3.org/2000/svg"
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path
        d="M436.5 90.5C500 140 560 230 552 320C544 410 468 470 388 512C308 554 214 578 148 534C82 490 44 378 56 280C68 182 130 98 210 60C290 22 373 41 436.5 90.5Z"
        fill={color}
      />
    </svg>
  );
}

/** A thin winding line echoing the compass/path motif, for full-width section backdrops. */
export function PathLines({ className, color = '#0A0A0A' }: { className?: string; color?: string }) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      viewBox="0 0 1200 400"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
    >
      <path
        d="M-20 340 C 180 380, 260 260, 420 280 S 640 200, 760 140 S 980 60, 1220 90"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeDasharray="1 14"
        strokeLinecap="round"
      />
      <path
        d="M-20 120 C 160 60, 280 160, 460 140 S 700 240, 860 260 S 1060 340, 1220 300"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeDasharray="1 14"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Four ascending steps echoing a "growth stage" motif — for sections about progression/stages. */
export function StaircaseAccent({ className, color = '#F5C400' }: { className?: string; color?: string }) {
  const bars = [
    { x: 40, y: 260, h: 90 },
    { x: 180, y: 200, h: 150 },
    { x: 320, y: 130, h: 220 },
    { x: 460, y: 50, h: 300 },
  ];
  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 560 360" xmlns="http://www.w3.org/2000/svg">
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width="90" height={b.h} rx="10" fill={color} opacity={0.15 + i * 0.06} />
      ))}
    </svg>
  );
}

/** Concentric compass rings — a faint echo of the hero mark, for large empty backdrops. */
export function CompassRings({ className, color = '#0A0A0A' }: { className?: string; color?: string }) {
  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
      <circle cx="200" cy="200" r="198" fill="none" stroke={color} strokeWidth="1" />
      <circle cx="200" cy="200" r="150" fill="none" stroke={color} strokeWidth="1" />
      <circle cx="200" cy="200" r="100" fill="none" stroke={color} strokeWidth="1" />
      <circle cx="200" cy="200" r="50" fill="none" stroke={color} strokeWidth="1" />
    </svg>
  );
}
