import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

// Each test sets how the fake Gemini model behaves for the main and fallback model names.
const behaviour: Record<string, () => Promise<unknown>> = {};
const calls: string[] = [];

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel({ model }: { model: string }) {
      return {
        generateContent: () => {
          calls.push(model);
          return behaviour[model]();
        },
      };
    }
  },
}));

const reply = (json: object) => async () => ({ response: { text: () => JSON.stringify(json) } });
const hangsForever = () => new Promise(() => {});
const overloaded = async () => {
  throw new Error('[503 Service Unavailable] This model is currently experiencing high demand.');
};

async function load() {
  vi.resetModules();
  process.env.GEMINI_API_KEY = 'test-key';
  process.env.GEMINI_MODEL = 'main-model';
  process.env.GEMINI_FALLBACK_MODEL = 'backup-model';
  return import('./geminiService');
}

const schema = z.object({ ok: z.boolean() });

describe('generateStructuredJson', () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it('gives up on a call that never finishes instead of hanging', async () => {
    const { generateStructuredJson, AiServiceError } = await load();
    behaviour['main-model'] = hangsForever;
    behaviour['backup-model'] = hangsForever;
    vi.useFakeTimers();
    const pending = generateStructuredJson('prompt', schema, { timeoutMs: 1000 });
    const settled = expect(pending).rejects.toBeInstanceOf(AiServiceError);
    await vi.advanceTimersByTimeAsync(30_000); // main 1s + backup 25s
    await settled;
    vi.useRealTimers();
  });

  it('switches to the backup model when the main one is overloaded', async () => {
    const { generateStructuredJson } = await load();
    behaviour['main-model'] = overloaded;
    behaviour['backup-model'] = reply({ ok: true });
    await expect(generateStructuredJson('prompt', schema, { timeoutMs: 1000 })).resolves.toEqual({ ok: true });
    expect(calls).toEqual(['main-model', 'backup-model']);
  });

  it('goes straight to the backup model while the main one is cooling down', async () => {
    const { generateStructuredJson } = await load();
    behaviour['main-model'] = overloaded;
    behaviour['backup-model'] = reply({ ok: true });
    await generateStructuredJson('prompt', schema, { timeoutMs: 1000 });
    calls.length = 0;
    await generateStructuredJson('prompt', schema, { timeoutMs: 1000 });
    expect(calls).toEqual(['backup-model']);
  });
});
