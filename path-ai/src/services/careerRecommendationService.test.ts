import { describe, it, expect } from 'vitest';
import { alignedTraits, reasonFromTraits, structuralAlignmentScore, type CareerAlignment } from './careerRecommendationService';

describe('structuralAlignmentScore', () => {
  it('gives a near-perfect Big Five score when user scores match the ideal profile', () => {
    const alignment: CareerAlignment = { bigFive: { OPENNESS: 0.9, CONSCIENTIOUSNESS: 0.8 } };
    const score = structuralAlignmentScore(
      'BIG_FIVE',
      { bigFive: { OPENNESS: { score: 90 }, CONSCIENTIOUSNESS: { score: 80 } } },
      alignment
    );
    expect(score).toBeCloseTo(1, 5);
  });

  it('penalizes Big Five scores far from the ideal profile', () => {
    const alignment: CareerAlignment = { bigFive: { OPENNESS: 0.9 } };
    const score = structuralAlignmentScore('BIG_FIVE', { bigFive: { OPENNESS: { score: 10 } } }, alignment);
    expect(score).toBeCloseTo(0.2, 5);
  });

  it('gives full credit for a direct MBTI type match', () => {
    const alignment: CareerAlignment = { mbti: { INTJ: 0.95, ENTP: 0.7 } };
    const score = structuralAlignmentScore('MBTI', { mbtiType: 'INTJ' }, alignment);
    expect(score).toBe(0.95);
  });

  it('gives partial credit for an MBTI type sharing some letters', () => {
    const alignment: CareerAlignment = { mbti: { INTJ: 1.0 } };
    // INTP shares 3 of 4 letters with INTJ (I, N, T match; P != J)
    const score = structuralAlignmentScore('MBTI', { mbtiType: 'INTP' }, alignment);
    expect(score).toBeCloseTo(0.75, 5);
  });

  it('returns a neutral fallback when framework/personality data is missing', () => {
    const score = structuralAlignmentScore('MBTI', {}, { mbti: { INTJ: 1.0 } });
    expect(score).toBe(0.4);
  });
});

describe('alignedTraits / reasonFromTraits', () => {
  it('names Big Five tendencies the career draws on that are on the same side as the answers', () => {
    const traits = alignedTraits(
      'BIG_FIVE',
      { bigFive: { OPENNESS: { score: 85 }, EXTRAVERSION: { score: 30 }, NEUROTICISM: { score: 25 } } },
      { bigFive: { OPENNESS: 0.9, EXTRAVERSION: 0.8, NEUROTICISM: 0.2 } }
    );
    expect(traits).toContain('curiosity and new ideas');
    expect(traits).toContain('staying calm under pressure');
    // Extraversion is wanted high but the answers were low — never cited as a reason.
    expect(traits).not.toContain('working with and talking to people');
  });

  it("names MBTI letters shared with the career's best-fitting type", () => {
    expect(alignedTraits('MBTI', { mbtiType: 'INTJ' }, { mbti: { ENTJ: 0.9, ISFP: 0.4 } })).toEqual([
      'ideas and the big picture',
      'logical problem solving',
    ]);
  });

  it('writes a reason with no score, percentage or promise', () => {
    const reason = reasonFromTraits('Architect', ['curiosity and new ideas']);
    expect(reason).toContain('curiosity and new ideas');
    expect(reason).not.toMatch(/%|guarantee|will succeed|best fit/i);
    expect(reasonFromTraits('Architect', [])).toMatch(/worth a look/);
  });
});
