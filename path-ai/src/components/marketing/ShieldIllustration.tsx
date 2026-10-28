// Brand illustration for the privacy/trust section — a shield mark in the PATH AI palette.
export function ShieldIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 460" className={className} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Illustration of a shield representing data privacy and trust">
      <rect x="0" y="0" width="480" height="460" rx="24" fill="#0A0A0A" />

      <path
        d="M240 60 L360 100 V220 C360 300 310 360 240 400 C170 360 120 300 120 220 V100 Z"
        fill="#F5C400"
      />
      <path
        d="M240 60 L360 100 V220 C360 300 310 360 240 400 C170 360 120 300 120 220 V100 Z"
        fill="none"
        stroke="#0A0A0A"
        strokeWidth="4"
      />
      <path
        d="M240 92 L336 124 V220 C336 286 296 336 240 368 C184 336 144 286 144 220 V124 Z"
        fill="none"
        stroke="#0A0A0A"
        strokeWidth="2"
        opacity="0.35"
      />

      {/* Checkmark */}
      <path d="M190 232 L226 268 L296 190" fill="none" stroke="#0A0A0A" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />

      {/* Orbit dots representing data points kept safe */}
      <circle cx="90" cy="150" r="6" fill="#FFFFFF" opacity="0.7" />
      <circle cx="70" cy="260" r="5" fill="#FFFFFF" opacity="0.5" />
      <circle cx="400" cy="150" r="6" fill="#FFFFFF" opacity="0.7" />
      <circle cx="410" cy="270" r="5" fill="#FFFFFF" opacity="0.5" />
    </svg>
  );
}
