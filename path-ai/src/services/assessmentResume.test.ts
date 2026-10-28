import { describe, it, expect } from 'vitest';
import { hasEnoughScoredAnswers, isReadyToSubmit, isReplayOfLastTurn, sanitizeSignals } from './assessmentService';

const coverage = (counts: number[]) => new Map(counts.map((n, i) => [`D${i}`, n]));

describe('isReadyToSubmit', () => {
  it('is not ready before the minimum number of answers', () => {
    expect(isReadyToSubmit(10, 15, coverage([2, 2, 2, 2, 2]))).toBe(false);
  });

  it('is ready at the minimum once every dimension has at least one answer', () => {
    expect(isReadyToSubmit(15, 15, coverage([3, 3, 3, 3, 3]))).toBe(true);
  });

  it('keeps asking past the minimum while a dimension is still uncovered', () => {
    expect(isReadyToSubmit(16, 15, coverage([4, 4, 4, 4, 0]))).toBe(false);
  });

  it('always stops at twice the minimum so a lopsided chat still ends', () => {
    expect(isReadyToSubmit(30, 15, coverage([10, 10, 10, 0, 0]))).toBe(true);
  });
});

describe('hasEnoughScoredAnswers', () => {
  it('builds the report when one answer the AI missed is the only gap', () => {
    expect(hasEnoughScoredAnswers(14, 15, coverage([3, 3, 3, 3, 2]))).toBe(true);
  });

  it('holds the report back when the AI scored nothing (it was down the whole chat)', () => {
    expect(hasEnoughScoredAnswers(0, 30, coverage([0, 0, 0, 0, 0]))).toBe(false);
  });

  it('holds the report back while a trait has fewer than two scored answers', () => {
    expect(hasEnoughScoredAnswers(12, 15, coverage([4, 4, 2, 1, 1]))).toBe(false);
  });

  it('holds the report back when fewer than two-thirds of the answers were scored', () => {
    // The busy-free-tier case seen in testing: 8 of 15 scored, two traits stuck at 50.
    expect(hasEnoughScoredAnswers(8, 15, coverage([2, 2, 2, 2, 2]))).toBe(false);
  });

  it('builds the report at exactly two-thirds scored with every trait read twice', () => {
    expect(hasEnoughScoredAnswers(10, 15, coverage([2, 2, 2, 2, 2]))).toBe(true);
  });
});

describe('isReplayOfLastTurn', () => {
  const last = { questionTextSnapshot: 'What do you do on a free evening?', responseText: 'I read books.' };

  it('recognises the same question and answer sent again (lost response / double click)', () => {
    expect(isReplayOfLastTurn(last, last.questionTextSnapshot, 'I read books.')).toBe(true);
    expect(isReplayOfLastTurn(last, last.questionTextSnapshot, '  I read books.  ')).toBe(true);
  });

  it('treats a different answer or a different question as a new turn', () => {
    expect(isReplayOfLastTurn(last, last.questionTextSnapshot, 'I play cricket.')).toBe(false);
    expect(isReplayOfLastTurn(last, 'Another question?', 'I read books.')).toBe(false);
  });

  it('is never a replay when nothing has been saved yet', () => {
    expect(isReplayOfLastTurn(null, 'Q', 'A')).toBe(false);
  });
});

describe('sanitizeSignals', () => {
  it('drops unknown dimensions and clamps values to the framework range', () => {
    expect(sanitizeSignals({ OPENNESS: 1.7, MADE_UP: 0.5, NEUROTICISM: -0.2 }, ['OPENNESS', 'NEUROTICISM'], 'BIG_FIVE')).toEqual({
      OPENNESS: 1,
      NEUROTICISM: 0,
    });
    expect(sanitizeSignals({ E_I: -3, S_N: Number.NaN }, ['E_I', 'S_N'], 'MBTI')).toEqual({ E_I: -1 });
  });
});
