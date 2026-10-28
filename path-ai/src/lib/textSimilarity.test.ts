import { describe, expect, it } from 'vitest';
import { isNearDuplicate } from './textSimilarity';

describe('isNearDuplicate', () => {
  it('catches a reworded repeat', () => {
    expect(
      isNearDuplicate('What do you usually do to relax after a long tiring week?', [
        'After a long, tiring week, how do you prefer to relax?',
      ])
    ).toBe(true);
  });

  it('allows a genuinely different question', () => {
    expect(
      isNearDuplicate('Your group project teammate is not doing their part. What do you do?', [
        'After a long, tiring week, how do you prefer to relax?',
      ])
    ).toBe(false);
  });

  it('allows a short reaction with no content words', () => {
    expect(isNearDuplicate('Ha, fair.', ['Ha, fair enough.'])).toBe(false);
  });
});
