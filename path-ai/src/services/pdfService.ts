import 'server-only';
import path from 'node:path';
import fs from 'node:fs/promises';
import React from 'react';
import { renderToBuffer, Document, Font, Page, Text, View, StyleSheet, Svg, Line, Circle, Ellipse, Rect } from '@react-pdf/renderer';
import {
  audienceCopy,
  careerAreas,
  everydayScales,
  exploreStepsFor,
  firstName,
  fitLabel,
  normalizeAudience,
  plainList,
  plainStrengths,
  plainText,
  reportBasis,
  studyApproaches,
  studyStartingPoint,
  STUDY_NOTE,
  suggestionLimitsFor,
} from '@/lib/parentReport';

// Server-side PDF generation (spec §12/§34). Reports are rendered from the already-persisted
// reportJson (see reportService.ts) so re-rendering never re-runs the assessment or AI calls.
// The PDF is written for parents: personality results only ever appear through the plain-language
// helpers in lib/parentReport — never as type codes, trait names or confidence numbers.

const REPORTS_DIR = path.join(process.cwd(), 'storage', 'reports');

// react-pdf hyphenates long words by default ("confi-dence"), which reads badly for parents.
Font.registerHyphenationCallback((word) => [word]);

const YELLOW = '#F5C400';
const BLACK = '#0A0A0A';
const GREY = '#6b7280';
const LIGHT = '#FFFBEA';
const LEARNING_COLORS: Record<string, string> = { seeing: YELLOW, listening: BLACK, reading: '#0EA5E9', doing: '#10B981' };
const AREA_COLORS = [YELLOW, '#0EA5E9', '#10B981', '#F97316', '#8B5CF6', '#EC4899'];

const styles = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 52, paddingHorizontal: 40, fontSize: 10.5, fontFamily: 'Helvetica', color: '#1f2933' },
  runningHeader: { position: 'absolute', top: 20, left: 40, right: 40, fontSize: 8, color: '#9ca3af', textAlign: 'right' },
  footer: {
    position: 'absolute',
    bottom: 22,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
    borderTop: '0.5pt solid #e5e7eb',
    paddingTop: 6,
  },
  banner: { backgroundColor: BLACK, borderRadius: 8, padding: 16, marginBottom: 12 },
  bannerKicker: { fontSize: 8, color: YELLOW, letterSpacing: 1.2, marginBottom: 4, fontFamily: 'Helvetica-Bold' },
  bannerTitle: { fontSize: 20, color: '#FFFFFF', fontFamily: 'Helvetica-Bold' },
  bannerMeta: { fontSize: 9, color: '#d1d5db', marginTop: 4 },
  tiles: { flexDirection: 'row', marginBottom: 6 },
  tile: { flex: 1, backgroundColor: LIGHT, borderLeft: `3pt solid ${YELLOW}`, borderRadius: 4, padding: 8, marginRight: 6 },
  tileLabel: { fontSize: 7.5, color: GREY, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  tileValue: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', color: BLACK },
  h2: { fontSize: 13.5, marginTop: 14, marginBottom: 8, color: BLACK, borderBottom: `2pt solid ${YELLOW}`, paddingBottom: 3, fontFamily: 'Helvetica-Bold' },
  note: { fontSize: 8.5, color: GREY, marginBottom: 6 },
  basis: { fontSize: 8.5, color: GREY, backgroundColor: '#f6f6f6', borderRadius: 4, padding: 7, marginBottom: 2 },
  paragraph: { marginBottom: 6 },
  bulletRow: { flexDirection: 'row', marginBottom: 3, marginLeft: 4 },
  bulletDot: { width: 10 },
  bulletText: { flex: 1 },
  barRow: { marginBottom: 7 },
  barHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  barLabel: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', color: BLACK },
  pill: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', borderRadius: 8, paddingVertical: 2, paddingHorizontal: 7 },
  track: { height: 7, backgroundColor: '#f1f1f1', borderRadius: 4 },
  fill: { height: 7, borderRadius: 4 },
  barMeaning: { fontSize: 8.5, color: GREY, marginTop: 2 },
  box: { backgroundColor: LIGHT, borderRadius: 6, padding: 10, marginTop: 4 },
  boxTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  learnRow: { flexDirection: 'row', alignItems: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  swatch: { width: 10, height: 10, borderRadius: 5, marginRight: 7 },
  legendLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  legendHint: { fontSize: 8.5, color: GREY },
  scaleRow: { marginBottom: 10 },
  scaleEnds: { flexDirection: 'row', justifyContent: 'space-between', fontSize: 8.5, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  scaleTrack: { height: 6, backgroundColor: '#FFF3B0', borderRadius: 3, position: 'relative' },
  scaleDot: { position: 'absolute', top: -4, width: 14, height: 14, borderRadius: 7, backgroundColor: YELLOW, border: `2.5pt solid ${BLACK}` },
  scaleSummary: { fontSize: 8, color: GREY, textAlign: 'center', marginTop: 5 },
  styleGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  styleCell: { width: '50%', paddingRight: 8, marginBottom: 6 },
  styleLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
  careerCard: { marginBottom: 8, padding: 9, borderRadius: 4, border: '0.5pt solid #e5e7eb' },
  careerHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  careerTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: BLACK },
  matchBadge: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: BLACK, backgroundColor: YELLOW, borderRadius: 8, paddingVertical: 2, paddingHorizontal: 7 },
  careerCategory: { fontSize: 8.5, color: GREY, marginBottom: 3 },
  roadmap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  roadmapStep: {
    fontSize: 8.5,
    color: BLACK,
    backgroundColor: LIGHT,
    border: `0.5pt solid ${YELLOW}`,
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 7,
    marginRight: 3,
    marginBottom: 4,
  },
  roadmapArrow: { fontSize: 10, color: '#9ca3af', marginRight: 3, marginBottom: 4 },
  tipRow: { flexDirection: 'row', marginBottom: 5 },
  tipNum: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: BLACK,
    color: '#FFFFFF',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    paddingTop: 3.5,
    marginRight: 7,
  },
  tipText: { flex: 1, paddingTop: 2.5 },
  cols: { flexDirection: 'row' },
  col: { flex: 1, paddingRight: 10 },
  colTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  disclaimer: { marginTop: 18, fontSize: 8, color: '#9ca3af', borderTop: '1pt solid #e5e7eb', paddingTop: 8, lineHeight: 1.4 },
});

const h = React.createElement;

function bullets(items: string[]) {
  return items.map((s, i) =>
    h(View, { key: i, style: styles.bulletRow, wrap: false }, h(Text, { style: styles.bulletDot }, '•'), h(Text, { style: styles.bulletText }, s))
  );
}

/** Splits a career title into at most two lines of ~24 characters for the map boxes, so long
 * titles are wrapped rather than cut off. The full title always appears in the cards below. */
export function titleLines(title: string, max = 24): string[] {
  if (title.length <= max) return [title];
  const words = title.split(' ');
  let first = '';
  while (words.length && (first + ' ' + words[0]).trim().length <= max) first = (first + ' ' + words.shift()).trim();
  if (!first) first = words.shift() ?? '';
  let second = words.join(' ');
  if (second.length > max) second = `${second.slice(0, max - 1)}…`;
  return second ? [first, second] : [first];
}

interface MatchLike {
  title: string;
  category: string;
  matchScore: number;
}

// Same radial layout as components/report/CareerMap.tsx, drawn with react-pdf's SVG primitives.
function CareerMapPdf({ name, matches }: { name: string; matches: MatchLike[] }) {
  const W = 515;
  const H = 280;
  const cx = W / 2;
  const cy = H / 2;
  const rx = 185;
  const ry = 104;
  const bw = 132;
  const bh = 40;
  const shown = matches.slice(0, 6);
  const areas = careerAreas(shown);
  const colorOf = (a: string) => AREA_COLORS[areas.findIndex((x) => x.area === a) % AREA_COLORS.length];
  const nodes = shown.map((m, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / shown.length;
    // Even ring (no pull towards the centre): six strong matches would otherwise overlap.
    return { ...m, x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry, color: colorOf(m.category) };
  });
  const shortName = name.length > 10 ? `${name.slice(0, 9)}.` : name;
  return h(
    View,
    { wrap: false },
    h(
      Svg,
      { width: W, height: H, viewBox: `0 0 ${W} ${H}` },
      ...[0.55, 0.78, 1].map((f) =>
        h(Ellipse, { key: `e${f}`, cx, cy, rx: rx * f, ry: ry * f, fill: 'none', stroke: '#E5E7EB', strokeWidth: 0.8, strokeDasharray: '2 4' })
      ),
      ...nodes.map((n) =>
        h(Line, { key: `l${n.title}`, x1: cx, y1: cy, x2: n.x, y2: n.y, stroke: n.color, strokeWidth: 1 + (n.matchScore / 100) * 3 })
      ),
      h(Circle, { cx, cy, r: 32, fill: BLACK, stroke: YELLOW, strokeWidth: 3 }),
      h(Text, { x: cx, y: cy + 4, textAnchor: 'middle', fill: '#FFFFFF', style: { fontSize: 11, fontFamily: 'Helvetica-Bold' } }, shortName),
      ...nodes.flatMap((n) => [
        h(Rect, { key: `r${n.title}`, x: n.x - bw / 2, y: n.y - bh / 2, width: bw, height: bh, rx: 6, fill: '#FFFFFF', stroke: n.color, strokeWidth: 1.5 }),
        h(Rect, { key: `s${n.title}`, x: n.x - bw / 2, y: n.y - bh / 2, width: 4, height: bh, rx: 2, fill: n.color }),
        ...titleLines(n.title).map((line, li, all) =>
          h(
            Text,
            { key: `t${n.title}${li}`, x: n.x - bw / 2 + 10, y: n.y - 2 - (all.length - 1 - li) * 9, fill: BLACK, style: { fontSize: 8.5, fontFamily: 'Helvetica-Bold' } },
            line
          )
        ),
        h(Text, { key: `f${n.title}`, x: n.x - bw / 2 + 10, y: n.y + 10, fill: GREY, style: { fontSize: 7.5 } }, fitLabel(n.matchScore)),
      ])
    ),
    h(
      View,
      { style: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, marginBottom: 6 } },
      ...areas.map((a) =>
        h(
          View,
          { key: a.area, style: { flexDirection: 'row', alignItems: 'center', marginRight: 12 } },
          h(View, { style: { width: 8, height: 8, borderRadius: 4, backgroundColor: colorOf(a.area), marginRight: 4 } }),
          h(Text, { style: { fontSize: 8, color: GREY } }, a.area)
        )
      )
    )
  );
}

const LEVEL_PILL = {
  'Clear in answers': { backgroundColor: YELLOW, color: BLACK },
  'Some signs': { backgroundColor: '#FFF3B0', color: BLACK },
  'Fewer signs': { backgroundColor: '#f1f1f1', color: GREY },
} as const;

const STYLE_ROWS: [string, string][] = [
  ['how_they_learn', 'Learning'],
  ['how_they_solve_problems', 'Solving problems'],
  ['how_they_communicate', 'Talking & sharing'],
  ['how_they_work_with_others', 'With friends & teams'],
  ['how_they_make_decisions', 'Making choices'],
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ReportDocument({ report }: { report: any }) {
  const meta = report.meta;
  const name = firstName(meta.studentName);
  const audience = normalizeAudience(meta.audience);
  const copy = audienceCopy(audience, name);
  const strengths = plainStrengths(report.personalityProfile);
  const approaches = studyApproaches(report.personalityProfile);
  const scales = everydayScales(report.personalityProfile);
  const matches: (MatchLike & { reasoning?: { whyItFits?: string }; skillGaps?: string[] })[] = report.careerMatches ?? [];
  const areas = careerAreas(matches);
  const areaColor = (a: string) => AREA_COLORS[areas.findIndex((x) => x.area === a) % AREA_COLORS.length];
  const studyHeadline = studyStartingPoint(approaches);
  const plan = report.actionPlan ?? { day_30: [], day_60: [], day_90: [] };
  const roadmap: string[] = report.careerRoadmap ?? [];
  const planChars = [...(plan.day_30 ?? []), ...(plan.day_60 ?? []), ...(plan.day_90 ?? [])].join('').length;

  return h(
    Document,
    {
      // Document properties shown by PDF readers and read out by screen readers in place of the
      // file name. Text is real text (not images), so it stays selectable, searchable and copyable.
      title: `${name}'s Strengths & Learning Report`,
      author: 'PATH AI',
      subject: 'Strengths, learning preferences and career exploration report',
      keywords: 'strengths, careers, learning, report',
      creator: 'PATH AI',
      producer: 'PATH AI',
      language: 'en-IN',
    },
    h(
      Page,
      { size: 'A4', style: styles.page },
      h(Text, {
        style: styles.runningHeader,
        fixed: true,
        render: ({ pageNumber }: { pageNumber: number }) => (pageNumber > 1 ? `${name}'s Strengths & Learning Report` : ''),
      }),
      h(Text, {
        style: styles.footer,
        fixed: true,
        render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `Page ${pageNumber} of ${totalPages}`,
      }),

      h(
        View,
        { style: styles.banner },
        h(Text, { style: styles.bannerKicker }, copy.kicker.toUpperCase()),
        h(Text, { style: styles.bannerTitle }, `${name}'s Strengths & Learning Report`),
        h(Text, { style: styles.bannerMeta }, `${meta.studentName}  ·  ${new Date(meta.assessmentDate).toDateString()}`)
      ),
      h(
        View,
        { style: styles.tiles },
        ...[
          ['CAME THROUGH MOST CLEARLY', strengths[0]?.label ?? '-'],
          ['STUDY IDEAS', studyHeadline],
          ['CAREER AREA TO EXPLORE FIRST', areas[0]?.area ?? '-'],
        ].map(([label, value]) =>
          h(View, { key: label, style: styles.tile }, h(Text, { style: styles.tileLabel }, label), h(Text, { style: styles.tileValue }, value))
        )
      ),

      h(Text, { style: styles.basis }, reportBasis(name)),

      h(Text, { style: styles.h2 }, `${name} in a nutshell`),
      h(Text, { style: styles.paragraph }, plainText(report.executiveSummary)),
      report.personalityAnalysis ? h(Text, { style: styles.paragraph }, plainText(report.personalityAnalysis)) : null,

      h(Text, { style: styles.h2, minPresenceAhead: 120 }, `What came through in ${name}'s answers`),
      h(Text, { style: styles.note }, `Longer bar = came through more clearly in what ${name} said. These are self-described tendencies, not tested skills.`),
      ...strengths.map((s) =>
        h(
          View,
          { key: s.label, style: styles.barRow, wrap: false },
          h(
            View,
            { style: styles.barHead },
            h(Text, { style: styles.barLabel }, s.label),
            h(Text, { style: { ...styles.pill, ...LEVEL_PILL[s.level] } }, s.level)
          ),
          h(View, { style: styles.track }, h(View, { style: { ...styles.fill, width: `${s.score}%`, backgroundColor: s.score >= 65 ? YELLOW : '#C9A000' } })),
          h(Text, { style: styles.barMeaning }, s.meaning)
        )
      ),
      report.naturalStrengths?.length
        ? h(
            View,
            { style: styles.box },
            h(Text, { style: styles.boxTitle, minPresenceAhead: 40 }, 'How this might show up day to day'),
            ...bullets(plainList(report.naturalStrengths))
          )
        : null,

      h(Text, { style: styles.h2, minPresenceAhead: 160 }, 'Study ideas to try'),
      h(Text, { style: styles.note }, STUDY_NOTE),
      h(
        View,
        { wrap: false },
        ...approaches.map((a, i) =>
          h(
            View,
            { key: a.key, style: styles.legendItem },
            h(View, { style: { ...styles.swatch, backgroundColor: LEARNING_COLORS[a.key] } }),
            h(View, {}, h(Text, { style: styles.legendLabel }, `${i + 1}. ${a.label}`), h(Text, { style: styles.legendHint }, a.hint))
          )
        )
      ),
      report.learningStyle?.description
        ? h(Text, { style: { ...styles.paragraph, marginTop: 6 } }, plainText(report.learningStyle.description))
        : null,
      report.learningStyle?.study_tips?.length
        ? h(
            View,
            { style: styles.box },
            h(Text, { style: styles.boxTitle, minPresenceAhead: 40 }, 'Tips worth trying'),
            ...bullets(plainList(report.learningStyle.study_tips))
          )
        : null,

      h(Text, { style: styles.h2, minPresenceAhead: 140 }, `${name}'s everyday style`),
      h(Text, { style: styles.note }, 'Neither side is better — these simply show what comes most naturally.'),
      ...scales.map((s) =>
        h(
          View,
          { key: s.left, style: styles.scaleRow, wrap: false },
          h(View, { style: styles.scaleEnds }, h(Text, {}, s.left), h(Text, {}, s.right)),
          h(View, { style: styles.scaleTrack }, h(View, { style: { ...styles.scaleDot, left: `${Math.min(96, Math.max(0, s.value - 2))}%` } })),
          h(Text, { style: styles.scaleSummary }, s.summary)
        )
      ),
      h(
        View,
        { style: styles.styleGrid },
        ...STYLE_ROWS.filter(([k]) => report.workStudyStyle?.[k]).map(([k, label]) =>
          h(
            View,
            { key: k, style: styles.styleCell },
            h(Text, { style: styles.styleLabel }, label),
            h(Text, { style: { color: GREY, fontSize: 9 } }, plainText(report.workStudyStyle[k]))
          )
        )
      ),

      h(Text, { style: styles.h2, minPresenceAhead: 300 }, 'Careers worth exploring'),
      h(Text, { style: styles.note }, 'Each line joins a career to the student. A thicker line means a closer fit with the answers given.'),
      h(CareerMapPdf, { name, matches }),
      ...matches.slice(0, 6).map((c, i) =>
        h(
          View,
          { key: i, style: { ...styles.careerCard, borderLeft: `3pt solid ${areaColor(c.category)}` }, wrap: false },
          h(View, { style: styles.careerHead }, h(Text, { style: styles.careerTitle }, c.title), h(Text, { style: styles.matchBadge }, fitLabel(c.matchScore))),
          h(Text, { style: styles.careerCategory }, c.category),
          c.reasoning?.whyItFits ? h(Text, {}, `Why it was suggested: ${plainText(c.reasoning.whyItFits)}`) : null,
          c.skillGaps?.length ? h(Text, { style: { fontSize: 8.5, color: GREY, marginTop: 3 } }, `Skills to build: ${c.skillGaps.join(', ')}`) : null
        )
      ),

      h(
        View,
        { style: styles.cols },
        h(
          View,
          { style: { ...styles.box, flex: 1, marginRight: 6 } },
          h(Text, { style: styles.boxTitle, minPresenceAhead: 40 }, "What these suggestions can and can't tell you"),
          ...bullets(suggestionLimitsFor(audience))
        ),
        h(
          View,
          { style: { ...styles.box, flex: 1 } },
          h(Text, { style: styles.boxTitle, minPresenceAhead: 40 }, 'How to explore a suggestion'),
          ...bullets(exploreStepsFor(audience))
        )
      ),

      h(
        View,
        {},
        h(Text, { style: styles.h2, minPresenceAhead: 60 }, 'The journey ahead'),
        h(
          View,
          { style: styles.roadmap },
          ...roadmap.flatMap((step, i) => {
            const nodes = [h(Text, { key: `step${i}`, style: styles.roadmapStep }, `${i + 1}. ${step}`)];
            if (i < roadmap.length - 1) nodes.push(h(Text, { key: `arrow${i}`, style: styles.roadmapArrow }, '›'));
            return nodes;
          })
        )
      ),

      report.parentTips?.length
        ? h(
            View,
            {},
            h(Text, { style: styles.h2, minPresenceAhead: 60 }, copy.tipsTitle),
            ...plainList(report.parentTips).map((tip, i) =>
              h(View, { key: i, style: styles.tipRow, wrap: false }, h(Text, { style: styles.tipNum }, String(i + 1)), h(Text, { style: styles.tipText }, tip))
            )
          )
        : null,

      h(
        View,
        { style: styles.cols },
        h(View, { style: styles.col }, h(Text, { style: styles.h2, minPresenceAhead: 60 }, `Where ${name} can grow`), ...bullets(plainList(report.developmentAreas))),
        h(
          View,
          { style: styles.col },
          h(Text, { style: styles.h2, minPresenceAhead: 60 }, 'Activities to try'),
          ...bullets(plainList(report.suggestedActivities)),
          h(Text, { style: { ...styles.colTitle, marginTop: 6 }, minPresenceAhead: 30 }, 'Useful skills to build'),
          h(Text, { style: styles.paragraph }, plainList(report.suggestedSkills).join('  ·  '))
        )
      ),

      h(
        View,
        // Kept on one page with its heading when short (the usual case); a very long plan is allowed
        // to break so it can never be clipped.
        { wrap: planChars > 900 },
        h(Text, { style: styles.h2 }, 'Next 3 months: a simple plan'),
        h(
          View,
          { style: styles.cols },
          ...(['day_30', 'day_60', 'day_90'] as const).map((k, i) =>
            h(
              View,
              { key: k, style: { ...styles.box, flex: 1, marginRight: i < 2 ? 6 : 0 } },
              h(Text, { style: styles.colTitle }, ['This month', 'Next month', 'Month three'][i]),
              ...bullets(plainList(plan[k]))
            )
          )
        )
      ),

      // Closing note and disclaimer travel together, so the disclaimer is never stranded alone on
      // an extra page. Both are short, so keeping them unbroken can't clip.
      h(
        View,
        { wrap: false },
        h(Text, { style: styles.h2 }, 'Good to keep in mind'),
        h(Text, { style: styles.paragraph }, plainText(report.careerRisksConsiderations)),
        h(Text, { style: styles.disclaimer }, copy.disclaimer)
      )
    )
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function renderReportPdfBuffer(reportJson: any): Promise<Buffer> {
  // ReportDocument renders a <Document> root at runtime; react-pdf's types just don't see
  // through the wrapper component, so the element type is asserted here.
  return renderToBuffer(h(ReportDocument, { report: reportJson }) as Parameters<typeof renderToBuffer>[0]);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function renderReportPdf(reportId: string, reportJson: any): Promise<string> {
  return storeReportPdf(reportId, await renderReportPdfBuffer(reportJson));
}

/** Caches an already-rendered PDF on disk and returns its path. */
export async function storeReportPdf(reportId: string, buffer: Buffer): Promise<string> {
  await fs.mkdir(REPORTS_DIR, { recursive: true });
  const filePath = path.join(REPORTS_DIR, `${reportId}.pdf`);
  await fs.writeFile(filePath, buffer);
  return filePath;
}
