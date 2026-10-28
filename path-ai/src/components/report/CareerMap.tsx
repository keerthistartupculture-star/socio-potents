// Radial "career map": the child sits in the middle and each matched career is placed around
// them on an even ring, with a thicker connecting line for a closer fit. (Placing strong fits
// nearer the centre made six strong matches pile onto each other.) Careers in the same area
// share a colour. On narrow screens the SVG would shrink its labels past legibility, so a
// stacked list takes its place.
import { careerAreas, fitLabel } from '@/lib/parentReport';

const AREA_COLORS = ['#F5C400', '#0EA5E9', '#10B981', '#F97316', '#8B5CF6', '#EC4899'];
const W = 640;
const H = 360;
const CX = W / 2;
const CY = H / 2;
const BOX_W = 150;
const BOX_H = 44;

export function CareerMap({ name, matches }: { name: string; matches: { title: string; category: string; matchScore: number }[] }) {
  const shown = matches.slice(0, 6);
  const areas = careerAreas(shown);
  const colorOf = (area: string) => AREA_COLORS[areas.findIndex((a) => a.area === area) % AREA_COLORS.length];

  const nodes = shown.map((m, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / shown.length;
    return {
      ...m,
      x: CX + Math.cos(angle) * 240,
      y: CY + Math.sin(angle) * 140,
      color: colorOf(m.category),
    };
  });

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="hidden w-full md:block" role="img" aria-label={`Career map for ${name}`}>
        {[0.55, 0.78, 1].map((f) => (
          <ellipse key={f} cx={CX} cy={CY} rx={240 * f} ry={140 * f} fill="none" stroke="#E5E7EB" strokeDasharray="3 6" />
        ))}
        {nodes.map((n) => (
          <line
            key={`l-${n.title}`}
            x1={CX}
            y1={CY}
            x2={n.x}
            y2={n.y}
            stroke={n.color}
            strokeWidth={1 + (n.matchScore / 100) * 4}
            strokeLinecap="round"
            opacity={0.8}
          />
        ))}
        <circle cx={CX} cy={CY} r={46} fill="#0A0A0A" />
        <circle cx={CX} cy={CY} r={46} fill="none" stroke="#F5C400" strokeWidth={4} />
        <text x={CX} y={CY + 5} textAnchor="middle" fontSize={15} fontWeight={700} fill="#FFFFFF">
          {name.length > 10 ? `${name.slice(0, 9)}…` : name}
        </text>
        {nodes.map((n) => (
          <g key={n.title} transform={`translate(${n.x - BOX_W / 2}, ${n.y - BOX_H / 2})`}>
            <rect width={BOX_W} height={BOX_H} rx={10} fill="#FFFFFF" stroke={n.color} strokeWidth={2} />
            <rect width={6} height={BOX_H} rx={3} fill={n.color} />
            <text x={14} y={19} fontSize={11.5} fontWeight={700} fill="#0A0A0A">
              {n.title.length > 21 ? `${n.title.slice(0, 20)}…` : n.title}
            </text>
            <text x={14} y={34} fontSize={10} fill="#6B7280">{fitLabel(n.matchScore)}</text>
          </g>
        ))}
      </svg>

      <ul className="space-y-2 md:hidden">
        {nodes.map((n) => (
          <li key={n.title} className="flex items-center gap-3 rounded-lg border border-border p-3" style={{ borderLeft: `5px solid ${n.color}` }}>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{n.title}</p>
              <p className="text-xs text-muted-foreground">{fitLabel(n.matchScore)}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap gap-3">
        {areas.map((a) => (
          <span key={a.area} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorOf(a.area) }} />
            {a.area}
          </span>
        ))}
      </div>
    </div>
  );
}
