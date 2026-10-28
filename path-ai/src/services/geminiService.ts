import 'server-only';
import { GoogleGenerativeAI, type GenerationConfig } from '@google/generative-ai';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// Server-only AI service layer (spec §5). GEMINI_API_KEY is read once here and never
// forwarded to the client. Every other service (assessment/personality/career/report)
// talks to Gemini exclusively through this module — swapping providers later means
// reimplementing this file's exported functions, not touching callers.

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
// Second model for when the first is overloaded (503), out of quota (429) or too slow. On the free
// tier each model has its own quota and load, so this keeps assessments scored when one model is
// struggling. Set GEMINI_FALLBACK_MODEL="" to turn it off.
const FALLBACK_MODEL_NAME = process.env.GEMINI_FALLBACK_MODEL ?? 'gemini-flash-lite-latest';

// After the main model is overloaded or too slow, go straight to the fallback for a while instead
// of making every student wait out the main model's timeout first on each answer.
const MAIN_MODEL_COOLDOWN_MS = 60_000;
let mainModelCooldownUntil = 0;

if (!API_KEY) {
  logger.error('GEMINI_API_KEY is not set: assessments cannot start and AI features are off. Run `npm run check:ai` after setting it.');
}

let client: GoogleGenerativeAI | null = null;
function getClient(): GoogleGenerativeAI {
  if (!API_KEY) {
    throw new AiServiceError('GEMINI_API_KEY is not configured on the server.');
  }
  if (!client) client = new GoogleGenerativeAI(API_KEY);
  return client;
}

export class AiServiceError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'AiServiceError';
  }
}

export function isGeminiConfigured(): boolean {
  return Boolean(API_KEY);
}

/**
 * Hard deadline for one Gemini request. The SDK's own `timeout` was seen not to fire when Google
 * started a reply and then stalled — the call hung for 5 minutes until Node's network limit ended
 * it, holding a student on the "building your report" screen. This cancels the request and moves
 * on regardless of where it is stuck. The error says "aborted" so callers treat it as a timeout.
 */
async function withDeadline<R>(ms: number, run: (signal: AbortSignal) => Promise<R>): Promise<R> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`Gemini request aborted: no complete reply within ${ms}ms`));
    }, ms);
  });
  try {
    return await Promise.race([run(controller.signal), deadline]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Calls Gemini with a prompt expected to return strict JSON, validates it against the
 * given zod schema, and retries once with a stricter instruction if parsing/validation
 * fails. Never lets malformed AI output propagate or crash the app (spec §29).
 */
export async function generateStructuredJson<T>(
  prompt: string,
  // Input intentionally left as `any`: schemas using `.default()` have a narrower Input
  // type than Output (T), and callers only care about the parsed Output shape.
  schema: z.ZodType<T, z.ZodTypeDef, any>,
  opts: { temperature?: number; maxOutputTokens?: number; timeoutMs?: number } = {}
): Promise<T> {
  const modelFor = (name: string) =>
    getClient().getGenerativeModel({
      model: name,
      generationConfig: {
        temperature: opts.temperature ?? 0.6,
        maxOutputTokens: opts.maxOutputTokens ?? 1024,
        responseMimeType: 'application/json',
        // The configured model "thinks" before answering by default, spending part of
        // maxOutputTokens on an invisible reasoning pass — with no reasoning benefit for a
        // simple extraction/classification task, that routinely ate the whole budget and cut
        // the actual JSON off mid-object (finishReason MAX_TOKENS). The @google/generative-ai
        // SDK's types predate this field, but it passes through to the REST body untouched.
        // Newer models reject 0 ("invalid argument"); 1 is their smallest accepted budget.
        thinkingConfig: { thinkingBudget: name === MODEL_NAME ? 0 : 1 },
      } as GenerationConfig & { thinkingConfig: { thinkingBudget: number } },
    });
  // Every Gemini call must be bounded — a slow/hung call must fail fast into the caller's
  // fallback rather than stall the conversation indefinitely.
  const timeout = opts.timeoutMs ?? 15_000;

  let lastError: unknown;
  // While the main model is cooling down, try the fallback first; the retry still goes to the main one.
  const startOnFallback = Boolean(FALLBACK_MODEL_NAME) && Date.now() < mainModelCooldownUntil;
  let useFallback = startOnFallback;
  let lastReplyWasBadJson = false;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const effectivePrompt = lastReplyWasBadJson
        ? `${prompt}\n\nIMPORTANT: Your previous reply was not valid JSON matching the required shape. Reply with ONLY the raw JSON object, no markdown fences, no extra text.`
        : prompt;

      // The fallback model is slower to answer (often 10–20s when the free tier is busy), so it gets
      // more time: a slow scored answer beats a fast unscored one.
      const name = useFallback ? FALLBACK_MODEL_NAME : MODEL_NAME;
      const limit = useFallback ? Math.max(timeout, 25_000) : timeout;
      const text = await withDeadline(limit, async (signal) => {
        const result = await modelFor(name).generateContent(effectivePrompt, { timeout: limit, signal });
        return result.response.text();
      });
      const parsed = extractJson(text);
      const validated = schema.safeParse(parsed);

      if (validated.success) return validated.data;
      lastError = validated.error;
      lastReplyWasBadJson = true;
      logger.warn('Gemini response failed schema validation, retrying', {
        attempt,
        issues: validated.error.issues.slice(0, 3),
      });
    } catch (err) {
      lastError = err;
      // extractJson's own error means the model answered, just not with JSON.
      lastReplyWasBadJson = err instanceof AiServiceError;
      logger.warn('Gemini call failed, retrying', { attempt, model: useFallback ? FALLBACK_MODEL_NAME : MODEL_NAME, error: String(err) });
      const busy = /\b(429|503)\b|Too Many Requests|RESOURCE_EXHAUSTED|UNAVAILABLE|high demand|overloaded|aborted/i.test(String(err));
      if (startOnFallback && attempt === 0) {
        // The fallback failed during the main model's cooldown: give the main model its turn.
        useFallback = false;
      } else if (attempt === 0 && FALLBACK_MODEL_NAME && busy) {
        // Overloaded, out of quota or too slow: the same model will most likely do it again, so
        // the retry goes to the fallback model straight away, and the next calls start there.
        mainModelCooldownUntil = Date.now() + MAIN_MODEL_COOLDOWN_MS;
        useFallback = true;
      } else if (attempt === 0 && /429|Too Many Requests|RESOURCE_EXHAUSTED/i.test(String(err))) {
        // A per-minute quota ("429 Too Many Requests") refuses an immediate retry the same way, so
        // give it a moment first. A daily quota will still fail; callers fall back as before.
        await new Promise((resolve) => setTimeout(resolve, 2500));
      } else if (attempt === 0 && /fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|\b50[0234]\b|UNAVAILABLE|overloaded/i.test(String(err))) {
        // A dropped connection or a briefly overloaded model usually clears within a second;
        // retrying instantly just hits the same blip and loses the answer's score.
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  throw new AiServiceError('Gemini did not return a valid structured response after retries.', lastError);
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const candidate = fencedMatch ? fencedMatch[1] : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
    }
    throw new AiServiceError('Could not locate JSON in Gemini response.');
  }
}

/**
 * Multi-turn chat call for the AI mentor feature — unlike generateStructuredJson/generateText,
 * this carries conversation history via Gemini's chat session so the mentor remembers what was
 * already said, rather than treating every message as a one-shot prompt.
 */
export async function generateMentorReply(params: {
  systemPrompt: string;
  history: { role: 'user' | 'model'; text: string }[];
  message: string;
  timeoutMs?: number;
}): Promise<string> {
  const { systemPrompt, history, message, timeoutMs } = params;
  const model = getClient().getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: 0.7,
      // Kept tight (~4 short sentences worth) so the model can't drift into multi-paragraph
      // replies even if it ignores the prompt's length instruction — the system prompt sets the
      // *style* (2-4 sentences), this is the hard backstop that makes it actually stick.
      maxOutputTokens: 200,
      thinkingConfig: { thinkingBudget: 0 },
    } as GenerationConfig & { thinkingConfig: { thinkingBudget: number } },
  });
  const chat = model.startChat({
    history: history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
  });

  try {
    const limit = timeoutMs ?? 15_000;
    const text = await withDeadline(limit, async (signal) => {
      const result = await chat.sendMessage(message, { timeout: limit, signal });
      return result.response.text().trim();
    });
    if (!text) throw new Error('Empty response from Gemini.');
    return text;
  } catch (err) {
    throw new AiServiceError('Gemini mentor chat call failed.', err);
  }
}

/** Free-text generation for narrative sections where strict JSON isn't required. */
export async function generateText(prompt: string, temperature = 0.7): Promise<string> {
  const model = getClient().getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: { temperature, thinkingConfig: { thinkingBudget: 0 } } as GenerationConfig & {
      thinkingConfig: { thinkingBudget: number };
    },
  });
  const result = await model.generateContent(prompt);
  return result.response.text();
}
