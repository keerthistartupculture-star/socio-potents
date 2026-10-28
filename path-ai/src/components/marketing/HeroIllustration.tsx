// Self-contained brand illustration — a compass/path motif in the PATH AI yellow/black/white
// palette. Kept as inline SVG (no external image dependency) so it always renders crisply
// and matches the theme tokens exactly.
export function HeroIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 480" className={className} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Abstract compass and career path illustration">
      <circle cx="240" cy="240" r="220" fill="#0A0A0A" />
      <circle cx="240" cy="240" r="220" fill="none" stroke="#F5C400" strokeWidth="2" strokeDasharray="2 10" opacity="0.5" />

      {/* Winding path */}
      <path
        d="M60 360 C 140 340, 150 260, 220 250 S 320 200, 340 140 S 400 90, 430 70"
        fill="none"
        stroke="#F5C400"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M60 360 C 140 340, 150 260, 220 250 S 320 200, 340 140 S 400 90, 430 70"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="1"
        strokeDasharray="1 14"
        strokeLinecap="round"
      />

      {/* Waypoint nodes along the path */}
      <circle cx="60" cy="360" r="9" fill="#FFFFFF" />
      <circle cx="220" cy="250" r="7" fill="#F5C400" />
      <circle cx="340" cy="140" r="7" fill="#F5C400" />
      <circle cx="430" cy="70" r="11" fill="#F5C400" stroke="#0A0A0A" strokeWidth="3" />

      {/* Compass ring */}
      <circle cx="240" cy="240" r="96" fill="#0A0A0A" stroke="#F5C400" strokeWidth="3" />
      <circle cx="240" cy="240" r="78" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.35" />
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i * 360) / 24;
        const rad = (angle * Math.PI) / 180;
        const inner = 78;
        const outer = i % 6 === 0 ? 90 : 84;
        const x1 = 240 + inner * Math.cos(rad);
        const y1 = 240 + inner * Math.sin(rad);
        const x2 = 240 + outer * Math.cos(rad);
        const y2 = 240 + outer * Math.sin(rad);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#F5C400" strokeWidth={i % 6 === 0 ? 2 : 1} opacity={i % 6 === 0 ? 0.9 : 0.4} />;
      })}

      {/* Compass needle */}
      <g transform="rotate(-35 240 240)">
        <polygon points="240,180 252,240 240,232 228,240" fill="#F5C400" />
        <polygon points="240,300 252,240 240,248 228,240" fill="#FFFFFF" />
      </g>
      <circle cx="240" cy="240" r="10" fill="#FFFFFF" stroke="#F5C400" strokeWidth="3" />
    </svg>
  );
}
