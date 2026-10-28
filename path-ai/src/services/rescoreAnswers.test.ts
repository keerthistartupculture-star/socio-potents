import { describe, it, expect, vi, beforeEach } from 'vitest';

// Simulates answers that got no AI reading during the chat (e.g. the provider's quota was hit)
// and checks what happens to them at submit.
const rows = [
  { id: 'r1', questionTextSnapshot: 'Big group or quiet night?', responseText: 'Quiet night with a book.', dimensionSignals: {} },
  { id: 'r2', questionTextSnapshot: 'Plan ahead or go with the flow?', responseText: 'I plan everything.', dimensionSignals: { J_P: -0.8 } },
  { id: 'r3', questionTextSnapshot: 'Logic or feelings?', responseText: 'Logic first.', dimensionSignals: {} },
];
const update = vi.fn();
const generate = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: { questionResponse: { findMany: vi.fn(async () => rows), update: (...a: unknown[]) => update(...a) } },
}));
vi.mock('@/services/geminiService', () => ({
  generateStructuredJson: (...a: unknown[]) => generate(...a),
  isGeminiConfigured: () => true,
}));
vi.mock('@/services/analyticsService', () => ({ trackEvent: vi.fn() }));

const { rescoreUnscoredAnswers } = await import('./assessmentService');

beforeEach(() => {
  update.mockReset();
  generate.mockReset();
});

describe('rescoreUnscoredAnswers', () => {
  it('scores only the answers that had no reading, in one AI call', async () => {
    generate.mockResolvedValue({
      results: [
        { index: 0, dimension_signals: { E_I: 0.9 }, confidence: 0.8 },
        { index: 1, dimension_signals: { T_F: -0.7, MADE_UP: 1 }, confidence: 0.7 },
      ],
    });
    await rescoreUnscoredAnswers('a1', 'MBTI');

    expect(generate).toHaveBeenCalledTimes(1);
    const prompt = generate.mock.calls[0][0] as string;
    expect(prompt).toContain('Quiet night with a book.');
    expect(prompt).toContain('Logic first.');
    expect(prompt).not.toContain('I plan everything.'); // already scored, left alone

    expect(update).toHaveBeenCalledTimes(2);
    expect(update.mock.calls[0][0]).toMatchObject({ where: { id: 'r1' }, data: { dimensionSignals: { E_I: 0.9 } } });
    // Dimensions outside the framework are dropped.
    expect(update.mock.calls[1][0]).toMatchObject({ where: { id: 'r3' }, data: { dimensionSignals: { T_F: -0.7 } } });
  });

  it('leaves answers unscored and does not throw when the AI is still unavailable', async () => {
    generate.mockRejectedValue(new Error('[429 Too Many Requests] quota exceeded'));
    await expect(rescoreUnscoredAnswers('a1', 'MBTI')).resolves.toBeUndefined();
    expect(update).not.toHaveBeenCalled();
  });
});
