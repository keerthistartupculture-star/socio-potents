// Brand illustration for "how the AI works" — a signal network resolving into a single
// path, echoing how scattered response signals get combined into one scored result.
export function NetworkIllustration({ className }: { className?: string }) {
  const nodes = [
    { x: 60, y: 80 }, { x: 60, y: 180 }, { x: 60, y: 280 },
    { x: 60, y: 380 }, { x: 60, y: 130 }, { x: 60, y: 330 },
  ];
  const center = { x: 260, y: 230 };
  const outputs = [{ x: 420, y: 150 }, { x: 420, y: 310 }];

  return (
    <svg viewBox="0 0 480 460" className={className} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Illustration of many response signals converging into a single scored result">
      <rect x="0" y="0" width="480" height="460" rx="24" fill="#0A0A0A" />

      {nodes.map((n, i) => (
        <line key={`l1-${i}`} x1={n.x} y1={n.y} x2={center.x} y2={center.y} stroke="#F5C400" strokeWidth="1.5" opacity="0.45" />
      ))}
      {outputs.map((o, i) => (
        <line key={`l2-${i}`} x1={center.x} y1={center.y} x2={o.x} y2={o.y} stroke="#FFFFFF" strokeWidth="2" opacity="0.7" />
      ))}

      {nodes.map((n, i) => (
        <circle key={`n-${i}`} cx={n.x} cy={n.y} r="10" fill="#FFFFFF" opacity="0.9" />
      ))}

      <circle cx={center.x} cy={center.y} r="34" fill="#F5C400" />
      <circle cx={center.x} cy={center.y} r="34" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.5" />
      <text x={center.x} y={center.y + 6} textAnchor="middle" fontSize="13" fontWeight="700" fill="#0A0A0A">SCORE</text>

      {outputs.map((o, i) => (
        <circle key={`o-${i}`} cx={o.x} cy={o.y} r="14" fill="none" stroke="#F5C400" strokeWidth="3" />
      ))}
    </svg>
  );
}
