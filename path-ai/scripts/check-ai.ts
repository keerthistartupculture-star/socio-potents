/**
 * Checks that the AI behind the assessment really works on this server: runs one real
 * assessment chat turn (the same prompt, Gemini call and answer checks a live assessment uses)
 * and prints what came back.
 *
 *   npm run check:ai
 *
 * Exit code 0 = the AI is working. Anything else prints what is wrong and how to fix it.
 * Spends one or two AI calls; touches no database.
 */
import { z } from 'zod';
import { GoogleGenerativeAI, type GenerationConfig } from '@google/generative-ai';
import { generateStructuredJson, isGeminiConfigured } from '@/services/geminiService';
import { buildConversationTurnPrompt } from '@/config/prompts/taskPrompts';
import { getSystemPromptForFramework } from '@/config/prompts/systemPrompts';
import { BIG_FIVE_DIMENSIONS } from '@/config/frameworks';

const turnSchema = z.object({
  dimension_signals: z.record(z.number()),
  confidence: z.number().min(0).max(1),
  reasoning_summary: z.string(),
  next_message: z.string().min(3),
  next_dimension: z.string().min(1),
});

function explain(err: unknown): string {
  const text = String((err as { cause?: unknown })?.cause ?? err);
  // Checked before the generic 403 below: Google also answers 403 when the key is fine but its
  // project has no free tier.
  if (/free tier is not available|set up billing/i.test(text))
    return 'The key is valid, but its Google Cloud project has no free tier. Turn on billing at https://aistudio.google.com/billing, then run this check again.';
  if (/API key not valid|API_KEY_INVALID|401|403|PERMISSION_DENIED/i.test(text))
    return 'The Gemini API key was rejected. Check GEMINI_API_KEY in .env (copy it again from Google AI Studio).';
  if (/404|not found|is not supported/i.test(text))
    return `The model "${process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite'}" is not available to this key. Set GEMINI_MODEL in .env to a model your key can use.`;
  if (/429|Too Many Requests|RESOURCE_EXHAUSTED|quota/i.test(text))
    return 'The key is valid but out of quota. Wait for the quota to reset, or enable billing on the Google Cloud project behind the key.';
  if (/aborted|timeout|ETIMEDOUT|ENOTFOUND|ECONNRESET|fetch failed/i.test(text))
    return 'Could not reach Google in time. Check that this server can make outbound HTTPS requests to generativelanguage.googleapis.com.';
  return text;
}

async function main() {
  console.log(`Model: ${process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite'}`);
  if (!isGeminiConfigured()) {
    console.error('FAIL: GEMINI_API_KEY is not set in .env. Assessments will not start until it is.');
    process.exit(1);
  }

  const dims = [...BIG_FIVE_DIMENSIONS];
  const prompt = buildConversationTurnPrompt({
    frameworkSystemPrompt: getSystemPromptForFramework('CLASS_10'),
    history: [],
    lastMessage: 'If you had a whole Saturday with no plans, how would you spend it?',
    lastAnswer: "I'd paint for a few hours, then go cycling with my two best friends in the evening.",
    lastDimension: dims[0],
    dimensionStreak: 1,
    priorSignals: {},
    suggestedNextDimension: dims[1],
    exampleScenario: 'Your class is planning a trip and nobody has made a list of what to bring. What do you do?',
    validDimensions: dims,
    userName: 'Test Student',
    alreadyAsked: ['If you had a whole Saturday with no plans, how would you spend it?'],
  });

  const started = Date.now();
  try {
    // Same settings as a live assessment turn, with a little more time for a cold first call.
    const turn = await generateStructuredJson(prompt, turnSchema, { temperature: 0.65, maxOutputTokens: 500, timeoutMs: 20_000 });
    const scored = Object.keys(turn.dimension_signals).filter((d) => (dims as string[]).includes(d));
    console.log(`Answered in ${((Date.now() - started) / 1000).toFixed(1)}s`);
    console.log(`Next question: ${turn.next_message}`);
    console.log(`Traits scored from the sample answer: ${scored.join(', ') || '(none)'}`);
    if (scored.length === 0) {
      console.error('FAIL: the AI replied but scored none of the traits, so answers would not count.');
      process.exit(1);
    }
    console.log('OK: the assessment AI is working.');
  } catch (err) {
    console.error(`FAIL: ${explain(err)}`);
    process.exit(1);
  }

  // The backup model the app switches to when the main one is overloaded. Not fatal if it is
  // down right now — the main model works — but worth knowing.
  const fallback = process.env.GEMINI_FALLBACK_MODEL ?? 'gemini-flash-lite-latest';
  if (!fallback) return;
  try {
    const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!).getGenerativeModel({
      model: fallback,
      generationConfig: { thinkingConfig: { thinkingBudget: 1 } } as GenerationConfig & { thinkingConfig: { thinkingBudget: number } },
    });
    await model.generateContent('Reply with the single word OK.', { timeout: 30_000 });
    console.log(`OK: backup model ${fallback} is working too.`);
  } catch (err) {
    console.log(`WARNING: backup model ${fallback} is not answering right now (${explain(err)}).`);
  }
}

main();
