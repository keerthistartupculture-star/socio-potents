import { describe, it, expect } from 'vitest';
import { signalScaleGuide, buildAnswerRescoringPrompt } from '@/config/prompts/taskPrompts';
import { scoreMbti } from './personalityService';
import { traitReads } from './reportService';

describe('signal direction in prompts', () => {
  it('tells the model which end of each MBTI scale is which letter', () => {
    expect(signalScaleGuide('E_I')).toMatch(/-1 = clearly Extraversion.*\+1 = clearly Introversion/);
    expect(signalScaleGuide('T_F')).toMatch(/-1 = clearly Thinking.*\+1 = clearly Feeling/);
    expect(signalScaleGuide('J_P')).toMatch(/-1 = clearly Judging.*\+1 = clearly Perceiving/);
  });

  it('describes Big Five as low-to-high', () => {
    expect(signalScaleGuide('OPENNESS')).toMatch(/0 = very low openness, 1 = very high openness/);
  });

  it('puts every dimension scale into the rescoring prompt', () => {
    const p = buildAnswerRescoringPrompt({ answers: [{ question: 'q', answer: 'a' }], dimensions: ['E_I', 'S_N', 'T_F', 'J_P'] });
    for (const d of ['Extraversion', 'Sensing', 'Thinking', 'Judging']) expect(p).toContain(d);
  });
});

describe('scoring follows the stated direction', () => {
  const sig = (dimension: string, signal: number) => ({ dimension, signal, weight: 1, confidence: 0.9 });

  it('turns clearly negative signals into E, S, T, J', () => {
    expect(scoreMbti(['E_I', 'S_N', 'T_F', 'J_P'].map((d) => sig(d, -0.8))).mbtiType).toBe('ESTJ');
  });

  it('turns clearly positive signals into I, N, F, P', () => {
    expect(scoreMbti(['E_I', 'S_N', 'T_F', 'J_P'].map((d) => sig(d, 0.8))).mbtiType).toBe('INFP');
  });
});

describe('fallback report is about the person, not one fixed text', () => {
  it('describes opposite MBTI types differently', () => {
    const a = traitReads('MBTI', { bigFive: null, mbtiType: 'ISTJ' }).map((r) => r.analysis);
    const b = traitReads('MBTI', { bigFive: null, mbtiType: 'ENFP' }).map((r) => r.analysis);
    expect(a).toHaveLength(4);
    expect(a.some((x) => b.includes(x))).toBe(false);
    expect(a.join(' ')).toMatch(/quiet time/);
    expect(b.join(' ')).toMatch(/being around people/);
  });

  it('only describes Big Five results that clearly lean one way', () => {
    const reads = traitReads('BIG_FIVE', {
      mbtiType: null,
      bigFive: { OPENNESS: { score: 85 }, CONSCIENTIOUSNESS: { score: 52 }, EXTRAVERSION: { score: 20 } },
    });
    expect(reads.map((r) => r.analysis)).toEqual([
      'is curious and enjoys new ideas and creative activities',
      'prefers smaller groups and quiet time to recharge',
    ]);
  });
});
