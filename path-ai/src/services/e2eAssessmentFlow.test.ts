import { describe, it, expect } from 'vitest';
import { scoreBigFive, scoreMbti } from './personalityService';
import { structuralAlignmentScore, type CareerAlignment } from './careerRecommendationService';

// End-to-end style test (spec §38): simulates a full assessment — a batch of scored
// responses in, personality scoring, then career matching against a small career pool —
// without touching the database or Gemini, so it runs anywhere in CI.

describe('end-to-end assessment flow (Class 10 / Big Five)', () => {
  it('takes response signals through to a ranked career shortlist', () => {
    const signals = [
      { dimension: 'OPENNESS', signal: 0.85, weight: 1, confidence: 0.9 },
      { dimension: 'OPENNESS', signal: 0.8, weight: 1, confidence: 0.85 },
      { dimension: 'CONSCIENTIOUSNESS', signal: 0.75, weight: 1, confidence: 0.8 },
      { dimension: 'EXTRAVERSION', signal: 0.4, weight: 1, confidence: 0.7 },
      { dimension: 'AGREEABLENESS', signal: 0.6, weight: 1, confidence: 0.75 },
      { dimension: 'NEUROTICISM', signal: 0.3, weight: 1, confidence: 0.7 },
    ];

    const personality = scoreBigFive(signals);
    expect(personality.overallConfidence).toBeGreaterThan(0);

    const careerPool: { title: string; alignment: CareerAlignment }[] = [
      { title: 'Research Scientist', alignment: { bigFive: { OPENNESS: 0.9, CONSCIENTIOUSNESS: 0.8 } } },
      { title: 'Bank Officer', alignment: { bigFive: { OPENNESS: 0.5, CONSCIENTIOUSNESS: 0.8 } } },
    ];

    const ranked = careerPool
      .map((c) => ({ title: c.title, score: structuralAlignmentScore('BIG_FIVE', { bigFive: personality.scores }, c.alignment) }))
      .sort((a, b) => b.score - a.score);

    expect(ranked[0].title).toBe('Research Scientist');
  });
});

describe('end-to-end assessment flow (Working Professional / MBTI)', () => {
  it('resolves a full MBTI type and ranks careers by type alignment', () => {
    const signals = [
      { dimension: 'E_I', signal: -0.6, weight: 1, confidence: 0.8 }, // -> E
      { dimension: 'S_N', signal: 0.5, weight: 1, confidence: 0.8 }, // -> N
      { dimension: 'T_F', signal: -0.5, weight: 1, confidence: 0.8 }, // -> T
      { dimension: 'J_P', signal: -0.4, weight: 1, confidence: 0.8 }, // -> J
    ];

    const personality = scoreMbti(signals);
    expect(personality.mbtiType).toBe('ENTJ');

    const careerPool: { title: string; alignment: CareerAlignment }[] = [
      { title: 'Management Consultant', alignment: { mbti: { ENTJ: 0.9 } } },
      { title: 'Graphic Designer', alignment: { mbti: { ISFP: 0.85 } } },
    ];

    const ranked = careerPool
      .map((c) => ({ title: c.title, score: structuralAlignmentScore('MBTI', { mbtiType: personality.mbtiType }, c.alignment) }))
      .sort((a, b) => b.score - a.score);

    expect(ranked[0].title).toBe('Management Consultant');
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });
});
