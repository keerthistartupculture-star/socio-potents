// A more detailed, layered illustration for the auth side-panels: a winding career path
// climbing through milestone markers (start, learning, first role, growth) with soft glow
// depth via gradients/blur — richer than the flat line-art compass used elsewhere.
export function JourneyIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 600" className={className} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Illustration of a winding career path climbing through milestone markers">
      <defs>
        <radialGradient id="pai-glow-a" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F5C400" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#F5C400" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pai-glow-b" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pai-path-stroke" x1="0" y1="600" x2="480" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F5C400" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#F5C400" />
        </linearGradient>
        <linearGradient id="pai-node-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE68A" />
          <stop offset="100%" stopColor="#F5C400" />
        </linearGradient>
      </defs>

      {/* Soft depth glows */}
      <circle cx="120" cy="480" r="170" fill="url(#pai-glow-a)" />
      <circle cx="360" cy="120" r="200" fill="url(#pai-glow-b)" />

      {/* Faint starfield */}
      {[
        [60, 90], [400, 60], [430, 260], [40, 260], [200, 40], [340, 400], [70, 380], [420, 480],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 2.4 : 1.4} fill="#FFFFFF" opacity={i % 2 === 0 ? 0.55 : 0.3} />
      ))}

      {/* The winding path */}
      <path
        d="M60 520 C 140 500, 150 430, 200 400 S 300 340, 320 280 S 260 180, 300 130 S 400 90, 420 60"
        fill="none"
        stroke="url(#pai-path-stroke)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M60 520 C 140 500, 150 430, 200 400 S 300 340, 320 280 S 260 180, 300 130 S 400 90, 420 60"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="1.5"
        strokeDasharray="1 12"
        opacity="0.6"
      />

      {/* Milestone: Start */}
      <g transform="translate(60 520)">
        <circle r="16" fill="#FFFFFF" />
        <circle r="16" fill="none" stroke="#F5C400" strokeWidth="3" />
      </g>

      {/* Milestone: Learning (graduation cap glyph) */}
      <g transform="translate(200 400)">
        <circle r="22" fill="url(#pai-node-fill)" />
        <path d="M-12 -3 L0 -9 L12 -3 L0 3 Z" fill="#0A0A0A" />
        <path d="M-7 -1 V7 C-7 10, 7 10, 7 7 V-1" fill="none" stroke="#0A0A0A" strokeWidth="1.6" />
      </g>

      {/* Milestone: First role (briefcase glyph) */}
      <g transform="translate(320 280)">
        <circle r="22" fill="url(#pai-node-fill)" />
        <rect x="-10" y="-4" width="20" height="14" rx="2" fill="none" stroke="#0A0A0A" strokeWidth="1.8" />
        <path d="M-5 -4 V-8 C-5 -10, 5 -10, 5 -8 V-4" fill="none" stroke="#0A0A0A" strokeWidth="1.8" />
      </g>

      {/* Milestone: Growth (star glyph) */}
      <g transform="translate(300 130)">
        <circle r="22" fill="url(#pai-node-fill)" />
        <path
          d="M0 -10 L2.8 -3.2 L10 -2.8 L4.5 2 L6 9 L0 5 L-6 9 L-4.5 2 L-10 -2.8 L-2.8 -3.2 Z"
          fill="#0A0A0A"
        />
      </g>

      {/* Milestone: Destination flag */}
      <g transform="translate(420 60)">
        <circle r="26" fill="#0A0A0A" stroke="#F5C400" strokeWidth="3" />
        <path d="M-6 8 V-9 L9 -6 L-6 -3" fill="#F5C400" />
        <line x1="-6" y1="-9" x2="-6" y2="8" stroke="#F5C400" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}
