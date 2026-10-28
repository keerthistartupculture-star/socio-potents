import { describe, it, expect } from 'vitest';
import { evidenceIsQuoted, progress, skillResults, strengthsAndGaps, type AttemptLike } from './skillProfile';
import { DIGITAL_MARKETING_ENTRY } from '@/config/pathways/digitalMarketingEntry';

const practical = (round: number, marks: Record<string, 1 | 2 | 3 | 4>, status: AttemptLike['status'] = 'MODERATED'): AttemptLike => ({
  round,
  status,
  finalMarks: Object.fromEntries(Object.entries(marks).map(([k, level]) => [k, { level, evidence: 'x', feedback: 'y' }])),
  task: {
    title: 'Write a post',
    kind: 'PRACTICAL',
    skillCodes: ['SOCIAL', 'AUDIENCE'],
    rubric: [
      { id: 'hook', skillCode: 'SOCIAL', criterion: 'Opening' },
      { id: 'cta', skillCode: 'SOCIAL', criterion: 'Call to action' },
      { id: 'aud', skillCode: 'AUDIENCE', criterion: 'Audience' },
    ],
  },
});
const knowledge = (round: number, correct: boolean): AttemptLike => ({
  round,
  status: 'AUTO_MARKED',
  isCorrect: correct,
  task: { title: 'Q', kind: 'KNOWLEDGE', skillCodes: ['SOCIAL'], rubric: [] },
});

describe('skillResults', () => {
  it('averages trainer-moderated criterion levels per skill, rounding down', () => {
    const [social, audience] = skillResults(['SOCIAL', 'AUDIENCE'], [practical(1, { hook: 2, cta: 3, aud: 4 })], 1);
    expect(social.level).toBe(2); // 2.5 rounds down: a level must be shown consistently
    expect(social.evidence).toHaveLength(2);
    expect(audience.level).toBe(4);
  });

  it('ignores answers still waiting for a trainer (AI drafts never count)', () => {
    const [social] = skillResults(['SOCIAL'], [practical(1, { hook: 4, cta: 4, aud: 4 }, 'SUBMITTED')], 1);
    expect(social.level).toBeNull();
  });

  it('reports knowledge separately and never mixes it into the practical level', () => {
    const [social] = skillResults(['SOCIAL'], [practical(1, { hook: 2, cta: 2, aud: 2 }), knowledge(1, true), knowledge(1, true)], 1);
    expect(social.level).toBe(2);
    expect(social.knowledge).toEqual({ correct: 2, total: 2 });
  });

  it('keeps rounds apart and reports progress', () => {
    const attempts = [practical(1, { hook: 2, cta: 2, aud: 2 }), practical(2, { hook: 3, cta: 4, aud: 2 })];
    const first = skillResults(['SOCIAL', 'AUDIENCE'], attempts, 1);
    const second = skillResults(['SOCIAL', 'AUDIENCE'], attempts, 2);
    expect(progress(first, second)).toEqual([
      { skillCode: 'SOCIAL', from: 2, to: 3, change: 1 },
      { skillCode: 'AUDIENCE', from: 2, to: 2, change: 0 },
    ]);
    const { strengths, gaps } = strengthsAndGaps(second);
    expect(strengths.map((s) => s.skillCode)).toEqual(['SOCIAL']);
    expect(gaps.map((s) => s.skillCode)).toEqual(['AUDIENCE']);
  });
});

describe('evidenceIsQuoted', () => {
  it('accepts real quotes regardless of spacing, case and curly quotes', () => {
    expect(evidenceIsQuoted('Grab your box   of Millet Cookies — this Saturday!', 'grab your box of millet cookies')).toBe(true);
    expect(evidenceIsQuoted("Don't miss it", 'Don’t miss it')).toBe(true);
  });
  it('rejects invented or empty evidence', () => {
    expect(evidenceIsQuoted('Visit us on Saturday', 'Order online now')).toBe(false);
    expect(evidenceIsQuoted('Visit us', '')).toBe(false);
  });
});

describe('Digital Marketing pilot content', () => {
  const { tasks, skills } = DIGITAL_MARKETING_ENTRY;
  const skillCodes = new Set(skills.map((s) => s.code));

  it('has an equivalent B form for every A form (same kind, skills and criteria)', () => {
    const groups = new Set(tasks.map((t) => t.variantGroup));
    for (const g of groups) {
      const a = tasks.find((t) => t.variantGroup === g && t.variant === 'A')!;
      const b = tasks.find((t) => t.variantGroup === g && t.variant === 'B')!;
      expect(a && b, g).toBeTruthy();
      expect(b.kind).toBe(a.kind);
      expect(b.skillCodes).toEqual(a.skillCodes);
      expect((b.rubric ?? []).map((c) => c.id)).toEqual((a.rubric ?? []).map((c) => c.id));
      expect(a.brief).not.toBe(b.brief);
    }
  });

  it('uses only defined skills, 4 levels per criterion, and valid answer keys', () => {
    for (const t of tasks) {
      for (const s of t.skillCodes) expect(skillCodes.has(s), `${t.code}:${s}`).toBe(true);
      for (const c of t.rubric ?? []) {
        expect(skillCodes.has(c.skillCode)).toBe(true);
        expect(c.levels.map((l) => l.level)).toEqual([1, 2, 3, 4]);
      }
      if (t.kind === 'KNOWLEDGE') {
        expect(t.answerIndex).toBeGreaterThanOrEqual(0);
        expect(t.answerIndex).toBeLessThan(t.options!.length);
      }
    }
  });

  it('checks every skill in both forms', () => {
    for (const v of ['A', 'B'] as const) {
      const covered = new Set(tasks.filter((t) => t.variant === v).flatMap((t) => t.skillCodes));
      expect([...skillCodes].every((s) => covered.has(s)), v).toBe(true);
    }
  });
});
