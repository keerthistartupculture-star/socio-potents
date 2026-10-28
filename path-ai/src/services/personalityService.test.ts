import { describe, it, expect } from 'vitest';
import { scoreBigFive, scoreMbti } from './personalityService';

describe('scoreBigFive', () => {
  it('produces a high score for consistently high signals on a dimension', () => {
    const result = scoreBigFive([
      { dimension: 'OPENNESS', signal: 0.9, weight: 1, confidence: 0.9 },
      { dimension: 'OPENNESS', signal: 0.85, weight: 1, confidence: 0.85 },
      { dimension: 'CONSCIENTIOUSNESS', signal: 0.3, weight: 1, confidence: 0.8 },
    ]);
    expect(result.scores.OPENNESS.score).toBeGreaterThan(80);
    expect(result.scores.CONSCIENTIOUSNESS.score).toBeLessThan(50);
  });

  it('returns neutral score with zero confidence when a dimension has no signals', () => {
    const result = scoreBigFive([{ dimension: 'OPENNESS', signal: 0.9, weight: 1, confidence: 0.9 }]);
    expect(result.scores.NEUROTICISM).toEqual({ score: 50, confidence: 0 });
  });

  it('weighs low-confidence signals less than high-confidence ones', () => {
    const highConfidence = scoreBigFive([
      { dimension: 'EXTRAVERSION', signal: 0.9, weight: 1, confidence: 1 },
      { dimension: 'EXTRAVERSION', signal: 0.1, weight: 1, confidence: 0.1 },
    ]);
    // The high-confidence 0.9 reading should dominate the low-confidence 0.1 reading.
    expect(highConfidence.scores.EXTRAVERSION.score).toBeGreaterThan(60);
  });
});

describe('scoreMbti', () => {
  it('resolves E/I toward Introversion for consistently positive signals', () => {
    const result = scoreMbti([
      { dimension: 'E_I', signal: 0.8, weight: 1, confidence: 0.9 },
      { dimension: 'E_I', signal: 0.6, weight: 1, confidence: 0.8 },
    ]);
    expect(result.poles.E_I).toBe('I');
    expect(result.scores.E_I.score).toBeGreaterThan(50);
  });

  it('resolves E/I toward Extraversion for consistently negative signals', () => {
    const result = scoreMbti([{ dimension: 'E_I', signal: -0.7, weight: 1, confidence: 0.9 }]);
    expect(result.poles.E_I).toBe('E');
  });

  it('builds a 4-letter type string across all dichotomies', () => {
    const result = scoreMbti([
      { dimension: 'E_I', signal: 0.5, weight: 1, confidence: 0.8 },
      { dimension: 'S_N', signal: 0.5, weight: 1, confidence: 0.8 },
      { dimension: 'T_F', signal: -0.5, weight: 1, confidence: 0.8 },
      { dimension: 'J_P', signal: -0.5, weight: 1, confidence: 0.8 },
    ]);
    expect(result.mbtiType).toHaveLength(4);
    expect(result.mbtiType).toBe('INTJ');
  });

  it('defaults unresolved dichotomies to the first pole with zero confidence', () => {
    const result = scoreMbti([{ dimension: 'E_I', signal: 0.5, weight: 1, confidence: 0.8 }]);
    expect(result.poles.J_P).toBe('J');
    expect(result.scores.J_P.confidence).toBe(0);
  });
});
