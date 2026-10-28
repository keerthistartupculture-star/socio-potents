// Plain-language view of a report, written for parents. The scoring engine still works in
// Big Five / MBTI dimensions internally, but none of that vocabulary (type codes like "ENTJ",
// trait names like "Neuroticism", "confidence %") is ever shown to the reader. Everything the
// report page and PDF display about personality goes through this module.
//
// Pure functions only — imported by both the client report page and the server PDF renderer.

export type Framework = 'BIG_FIVE' | 'MBTI';

interface DimScore {
  score: number;
  confidence?: number;
}

export interface PersonalityProfileInput {
  framework: Framework;
  bigFive?: Record<string, DimScore> | null;
  mbti?: { scores?: Record<string, DimScore> } | null;
}

// Levels describe how clearly a tendency came through in what the person SAID about themselves.
// They are deliberately not "strong/weak": nothing here was tested or observed.
export type StrengthLevel = 'Clear in answers' | 'Some signs' | 'Fewer signs';

export interface PlainStrength {
  label: string;
  score: number; // 0-100
  level: StrengthLevel;
  meaning: string;
}

export interface EverydayScale {
  left: string;
  right: string;
  value: number; // 0 = fully left, 100 = fully right
  summary: string;
}

export interface StudyApproach {
  key: 'seeing' | 'listening' | 'reading' | 'doing';
  label: string;
  hint: string;
}

const levelFor = (score: number): StrengthLevel =>
  score >= 65 ? 'Clear in answers' : score >= 45 ? 'Some signs' : 'Fewer signs';

function bigFiveAt(profile: PersonalityProfileInput, key: string): number {
  return profile.bigFive?.[key]?.score ?? 50;
}

// MBTI scores are stored as strength toward the SECOND pole (E_I → I, S_N → N, T_F → F, J_P → P).
function mbtiAt(profile: PersonalityProfileInput, key: string): number {
  return profile.mbti?.scores?.[key]?.score ?? 50;
}

/** Tendencies that came through in the answers (self-described, not tested) — clearest first. */
export function plainStrengths(profile: PersonalityProfileInput): PlainStrength[] {
  let items: Omit<PlainStrength, 'level'>[];
  if (profile.framework === 'BIG_FIVE') {
    items = [
      {
        label: 'Curiosity & Creativity',
        score: bigFiveAt(profile, 'OPENNESS'),
        meaning: 'Enjoys new ideas, asks "why", and likes to imagine and create.',
      },
      {
        label: 'Focus & Responsibility',
        score: bigFiveAt(profile, 'CONSCIENTIOUSNESS'),
        meaning: 'Plans ahead, finishes tasks, and can be trusted with work.',
      },
      {
        label: 'Confidence with People',
        score: bigFiveAt(profile, 'EXTRAVERSION'),
        meaning: 'Comfortable speaking up, making friends, and working in groups.',
      },
      {
        label: 'Kindness & Teamwork',
        score: bigFiveAt(profile, 'AGREEABLENESS'),
        meaning: 'Cares about others, shares, and helps the team get along.',
      },
      {
        label: 'Calm Under Pressure',
        score: 100 - bigFiveAt(profile, 'NEUROTICISM'),
        meaning: 'Stays steady during exams, changes, and setbacks.',
      },
    ];
  } else {
    const people = 100 - mbtiAt(profile, 'E_I');
    const imagination = mbtiAt(profile, 'S_N');
    const heart = mbtiAt(profile, 'T_F');
    const flexible = mbtiAt(profile, 'J_P');
    items = [
      people >= 50
        ? { label: 'Confidence with People', score: people, meaning: 'Gains energy from friends, groups and conversation.' }
        : { label: 'Independent Thinking', score: 100 - people, meaning: 'Thinks deeply and does well working on their own.' },
      imagination >= 50
        ? { label: 'Big-Picture Imagination', score: imagination, meaning: 'Spots patterns, dreams up ideas, and thinks about the future.' }
        : { label: 'Practical, Hands-on Approach', score: 100 - imagination, meaning: 'Prefers real, hands-on tasks and paying attention to detail.' },
      heart >= 50
        ? { label: 'Caring & Understanding', score: heart, meaning: 'Notices how others feel and makes fair, kind choices.' }
        : { label: 'Logical Problem Solving', score: 100 - heart, meaning: 'Thinks clearly and looks for the most sensible answer.' },
      flexible >= 50
        ? { label: 'Adaptability', score: flexible, meaning: 'Handles surprises well and keeps options open.' }
        : { label: 'Planning & Organising', score: 100 - flexible, meaning: 'Likes clear plans, deadlines and getting things done.' },
    ];
  }
  return items
    .map((s) => ({ ...s, score: Math.round(s.score), level: levelFor(s.score) }))
    .sort((a, b) => b.score - a.score);
}

/** Two-sided "everyday style" sliders — neither end is better than the other. */
export function everydayScales(profile: PersonalityProfileInput): EverydayScale[] {
  const scale = (left: string, right: string, value: number): EverydayScale => {
    const v = Math.round(value);
    const summary =
      v >= 40 && v <= 60 ? 'A good balance of both' : v > 60 ? `Leans towards ${right.toLowerCase()}` : `Leans towards ${left.toLowerCase()}`;
    return { left, right, value: v, summary };
  };
  if (profile.framework === 'BIG_FIVE') {
    return [
      scale('Quiet time', 'Time with people', bigFiveAt(profile, 'EXTRAVERSION')),
      scale('Familiar routines', 'New experiences', bigFiveAt(profile, 'OPENNESS')),
      scale('Go with the flow', 'Plan everything', bigFiveAt(profile, 'CONSCIENTIOUSNESS')),
    ];
  }
  return [
    scale('Time with people', 'Quiet time', mbtiAt(profile, 'E_I')),
    scale('Practical & real', 'Ideas & imagination', mbtiAt(profile, 'S_N')),
    scale('Decides with logic', 'Decides with feelings', mbtiAt(profile, 'T_F')),
    scale('Plans ahead', 'Keeps it flexible', mbtiAt(profile, 'J_P')),
  ];
}

const SLICE_META: Record<StudyApproach['key'], { label: string; hint: string }> = {
  seeing: { label: 'Seeing', hint: 'pictures, diagrams, videos, colour' },
  listening: { label: 'Listening & talking', hint: 'explaining, discussing, group study' },
  reading: { label: 'Reading & writing', hint: 'notes, summaries, lists' },
  doing: { label: 'Doing', hint: 'hands-on practice, experiments, projects' },
};

/**
 * Ways of studying to try first, in order, from preferences that came through in the answers.
 * Deliberately NOT a "learning style" or a percentage split: research does not support sorting
 * people into fixed learning styles, and nothing here measured how the person actually learns.
 * Ordering only — the report always says that mixing methods works best for most people.
 */
export function studyApproaches(profile: PersonalityProfileInput): StudyApproach[] {
  let w: Record<StudyApproach['key'], number>;
  if (profile.framework === 'BIG_FIVE') {
    const o = bigFiveAt(profile, 'OPENNESS');
    const c = bigFiveAt(profile, 'CONSCIENTIOUSNESS');
    const e = bigFiveAt(profile, 'EXTRAVERSION');
    w = { seeing: o, reading: c, listening: e, doing: 100 - Math.max(o, c, e) };
  } else {
    const inward = mbtiAt(profile, 'E_I');
    const ideas = mbtiAt(profile, 'S_N');
    w = { listening: 100 - inward, reading: inward, seeing: ideas, doing: 100 - ideas };
  }
  return (Object.keys(w) as StudyApproach['key'][])
    .sort((a, b) => w[b] - w[a])
    .map((key) => ({ key, ...SLICE_META[key] }));
}

/** Short headline for the study section, e.g. "Try first: listening & talking, reading & writing". */
export function studyStartingPoint(approaches: StudyApproach[]): string {
  const top = approaches.slice(0, 2).map((a) => a.label.toLowerCase());
  return top.length ? `Try first: ${top.join(', ')}` : 'Try a mix of ways';
}

export const STUDY_NOTE =
  'There is no good evidence that people have one fixed "learning style". Most people learn best by mixing methods, so treat these as starting points to try, not rules.';

export interface CareerAreaNode {
  area: string;
  score: number;
  careers: string[];
}

/** Groups career matches into areas for the career map, strongest first. */
export function careerAreas(matches: { title: string; category: string; matchScore: number }[]): CareerAreaNode[] {
  const byArea = new Map<string, CareerAreaNode>();
  for (const m of matches) {
    const node = byArea.get(m.category) ?? { area: m.category, score: 0, careers: [] };
    node.score = Math.max(node.score, Math.round(m.matchScore));
    node.careers.push(m.title);
    byArea.set(m.category, node);
  }
  return [...byArea.values()].sort((a, b) => b.score - a.score);
}

/**
 * Plain label for how closely the answers line up with a career. Words only — the underlying
 * number is a similarity between self-described tendencies and a career profile, so showing it
 * as a percentage would wrongly suggest a measured chance of success.
 */
export function fitLabel(score: number): string {
  return score >= 80 ? 'Closer match' : score >= 65 ? 'Good overlap' : score >= 50 ? 'Some overlap' : 'Worth exploring';
}

/** What the whole report rests on — shown near the top of the web report and the PDF. */
export function reportBasis(name: string): string {
  return `This report is based on ${name}'s answers in a short conversation about how they usually think and act. It describes preferences and tendencies ${name} reported about themselves. It did not test knowledge, skills or ability.`;
}

/** Shown with the career suggestions, on screen and in the PDF. */
export const SUGGESTION_LIMITS: string[] = [
  'A suggestion means the answers line up with traits often described for that kind of work. It does not predict success, a job, admission or earnings.',
  'Interests and personality keep developing, especially during school and college.',
  'Marks, subject requirements, costs, location and job availability also matter, and are not covered here.',
  'Suggestions only come from the careers in our list, so good options may be missing.',
];

/** Practical next steps for checking whether a suggestion is worth pursuing. */
export const EXPLORE_STEPS: string[] = [
  'Read or watch what a normal working day looks like in this job.',
  'Talk to someone who does this work, and ask what they like and find hard.',
  'Try a small related task, club, or free beginner course.',
  'Check the entry routes: subjects, courses or exams this work needs.',
  'Compare it with one other suggestion before deciding anything.',
];

// Working professionals get the same points in their own terms — "school and college", marks and
// subject requirements don't apply to someone already in a job.
const PROFESSIONAL_SUGGESTION_LIMITS: string[] = [
  SUGGESTION_LIMITS[0],
  'Interests and priorities keep changing throughout a career.',
  'Experience, qualifications, pay, location and job availability also matter, and are not covered here.',
  SUGGESTION_LIMITS[3],
];

const PROFESSIONAL_EXPLORE_STEPS: string[] = [
  EXPLORE_STEPS[0],
  EXPLORE_STEPS[1],
  'Try a small related project at work, a side project, or a short course.',
  'Check the entry routes: experience, certifications or retraining this work needs.',
  EXPLORE_STEPS[4],
];

export function suggestionLimitsFor(audience: ReportAudience): string[] {
  return audience === 'PROFESSIONAL' ? PROFESSIONAL_SUGGESTION_LIMITS : SUGGESTION_LIMITS;
}

export function exploreStepsFor(audience: ReportAudience): string[] {
  return audience === 'PROFESSIONAL' ? PROFESSIONAL_EXPLORE_STEPS : EXPLORE_STEPS;
}

const JARGON: [RegExp, string][] = [
  [/\b(?:your|their|his|her|an?|the)\s+[EI][SN][TF][JP](?:-[AT])?\s+(?:type|profile|preferences?|personality)\b/gi, 'their natural style'],
  [/\s*\(?\b[EI][SN][TF][JP](?:-[AT])?\b\)?/g, ''],
  // "labels like MBTI" → "labels" (replacing the name here produced "labels like this assessment").
  [/\s*\b(?:like|such as)\s+(?:the\s+)?(?:Myers[- ]Briggs|MBTI|Big ?Five|OCEAN)(?:\s+(?:types?|labels?|test))?\b/gi, ''],
  [/\bMyers[- ]Briggs\b|\bMBTI\b|\bBig ?Five\b|\bOCEAN\b/gi, 'this assessment'],
  [/\bextra(?:v|ve)rsion\b/gi, 'social energy'],
  [/\bextro?vert(?:ed)?\b/gi, 'outgoing'],
  [/\bintroversion\b/gi, 'enjoying quiet time'],
  [/\bintrovert(?:ed)?\b/gi, 'reflective'],
  [/\bneuroticism\b/gi, 'sensitivity to stress'],
  [/\bconscientiousness\b/gi, 'responsibility'],
  [/\bagreeableness\b/gi, 'kindness'],
  [/\bopenness(?: to experience)?\b/gi, 'curiosity'],
  [/\b(?:high|low) (?:scores? (?:in|on) )?(?:sensing|intuition|thinking|feeling|judging|perceiving)\b/gi, 'their natural style'],
  [/\bpsychometric\b/gi, ''],
  [/\s{2,}/g, ' '],
];

/**
 * Safety net for AI-written text: removes type codes and framework terms that slip past the
 * prompt, and also cleans reports generated before the parent-friendly rewrite.
 */
export function plainText(text: string | undefined | null): string {
  if (!text) return '';
  return JARGON.reduce((t, [re, sub]) => t.replace(re, sub), text).replace(/\s+([.,;])/g, '$1').trim();
}

export function plainList(items: string[] | undefined | null): string[] {
  return (items ?? []).map(plainText).filter(Boolean);
}

export function firstName(fullName: string | undefined | null): string {
  return (fullName ?? '').trim().split(/\s+/)[0] || 'Your child';
}

/**
 * Who the report is written for. Class 10 reports go to parents; Class 12 to diploma and degree
 * students read their own report; working professionals get work-focused wording. Reports saved
 * before this split carry 'SELF', which reads as STUDENT.
 */
export type ReportAudience = 'PARENT' | 'STUDENT' | 'PROFESSIONAL';

export function audienceForEducation(level: string): ReportAudience {
  if (level === 'CLASS_10') return 'PARENT';
  if (level === 'WORKING_PROFESSIONAL') return 'PROFESSIONAL';
  return 'STUDENT';
}

export function normalizeAudience(audience: string | undefined | null): ReportAudience {
  return audience === 'PARENT' || audience === 'PROFESSIONAL' ? audience : 'STUDENT';
}

/** Headings and closing text that change with the reader. */
export function audienceCopy(audience: ReportAudience, name: string) {
  switch (audience) {
    case 'PARENT':
      return {
        kicker: 'A guide for parents',
        tipsTitle: `How you can help ${name} at home`,
        disclaimer:
          'This report is a guide for exploring strengths and career interests. It is not a medical or psychological diagnosis, and it should be used alongside conversations with teachers, counsellors and your child.',
      };
    case 'PROFESSIONAL':
      return {
        kicker: 'Strengths & career report',
        tipsTitle: 'Ways to put this into practice',
        disclaimer:
          'This report is a guide for reflecting on your work preferences and exploring career options. It is not a psychological diagnosis or an assessment of job performance, and works best alongside conversations with a mentor, manager or career counsellor.',
      };
    default:
      return {
        kicker: 'Strengths & learning report',
        tipsTitle: `How family and friends can help ${name}`,
        disclaimer:
          'This report is a guide for exploring your strengths and career interests. It is not a medical or psychological diagnosis, and it works best alongside conversations with teachers, counsellors and family.',
      };
  }
}
