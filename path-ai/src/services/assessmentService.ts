import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import {
  frameworkForEducation,
  MIN_QUESTIONS_BY_FRAMEWORK,
  BIG_FIVE_DIMENSIONS,
  MBTI_DIMENSION_PAIRS,
} from '@/config/frameworks';
import { getSystemPromptForFramework } from '@/config/prompts/systemPrompts';
import { buildOpeningMessagePrompt, buildConversationTurnPrompt, buildAnswerRescoringPrompt } from '@/config/prompts/taskPrompts';
import { generateStructuredJson, isGeminiConfigured } from '@/services/geminiService';
import { computeAndPersistPersonalityScore } from '@/services/personalityService';
import { generateCareerRecommendations } from '@/services/careerRecommendationService';
import { generateReport } from '@/services/reportService';
import { trackEvent } from '@/services/analyticsService';
import { isNearDuplicate } from '@/lib/textSimilarity';
import { Prisma } from '@prisma/client';
import type { Assessment, AssessmentFramework, EducationLevel, InputMethod, QuestionResponse } from '@prisma/client';

// This is a free-form conversation, not a fixed question bank fired one at a time: there is no
// pre-scripted "question N of M". Each turn, one Gemini call analyzes the answer just given AND
// decides what to say next — either a natural follow-up on the same personality dimension, or a
// warm transition into whichever dimension is least-covered so far. What never changes is that
// *scoring* and *when the conversation ends* stay 100% deterministic code (spec intent): Gemini
// only ever proposes a dimension_signals reading for one answer at a time, never gets to declare
// the conversation "done" itself, and never gets to invent a dimension outside the framework's
// fixed set (BIG_FIVE_DIMENSIONS / MBTI_DIMENSION_PAIRS).

const APP_VERSION = {
  assessmentVersion: '1.0.0',
  questionBankVersion: '1.0.0',
  promptVersion: '1.0.0',
  aiModelVersion: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
  scoringAlgorithmVersion: '1.0.0',
};

// What's carried between turns via AssessmentSession.conversationState (a free-form Json
// column, so no migration needed): the message the user is currently expected to answer, and
// which dimension it's probing — so a page reload before they've answered doesn't generate
// (and pay for) a new message, and submitResponse knows what the answer being submitted is for.
// dimensionStreak counts how many consecutive messages have stayed on pendingDimension, so the
// prompt can tell the model "you've lingered here N times" rather than it defaulting to a new
// topic every single turn, which read as an interview instead of a conversation.
// usedExamples remembers which bank scenarios were already handed to the model as style
// references, so the same one is never offered twice (the model tends to echo it).
// readyToSubmit is set once enough answers are in: the conversation stops asking and the user
// reviews their answers and presses Submit themselves — the report is never generated silently.
interface ConversationState {
  pendingDimension?: string;
  pendingMessage?: string;
  dimensionStreak?: number;
  usedExamples?: string[];
  readyToSubmit?: boolean;
}

export interface TranscriptTurn {
  order: number;
  question: string;
  answer: string;
}

/** Enough answers to score reliably: the framework minimum with every dimension touched at
 * least once, or twice the minimum regardless (so a lopsided chat still ends). Pure, so the
 * same rule decides "done" on submit and "ready to submit" on resume. */
// A sentence that judges or interprets the last answer ("That sounds like a constructive way…",
// "Great!", "It's clear you…"). Praise like that tells the person which answers are "good" and
// skews the rest of the assessment, so it is dropped even when the model writes it anyway.
const JUDGING_OPENER =
  /^(that|this|it|which)('s|’s| is| was| sounds| seems| shows| must| makes| really| definitely)\b|^(great|nice|wonderful|awesome|amazing|impressive|interesting|love that|i love|wow|good for you|what a|sounds like|it'?s clear|clearly)\b/i;

/** Removes leading sentences that praise or interpret the person, keeping the question itself. */
export function stripJudgingOpeners(message: string): string {
  let rest = message.trim();
  for (let i = 0; i < 3; i += 1) {
    const m = rest.match(/^([^.!?]*[.!])\s+(.+)$/s);
    if (!m || !JUDGING_OPENER.test(m[1].trim())) break;
    rest = m[2].trim();
  }
  return rest;
}

/** Enough AI-scored answers for a meaningful report: every trait read at least twice, and at
 * least two-thirds of the answers scored. Below that, traits drift to a meaningless 50. */
export function hasEnoughScoredAnswers(scored: number, answered: number, coverage: Map<string, number>): boolean {
  return [...coverage.values()].every((n) => n >= 2) && scored * 3 >= answered * 2;
}

export function isReadyToSubmit(answeredCount: number, minRequired: number, coverage: Map<string, number>): boolean {
  const allCovered = [...coverage.values()].every((n) => n >= 1);
  return (answeredCount >= minRequired && allCovered) || answeredCount >= minRequired * 2;
}

/** A retried submit (lost response, double click, refresh mid-request) carries the same
 * question and answer as the last saved turn — recognise it instead of saving it twice. */
export function isReplayOfLastTurn(
  last: { questionTextSnapshot: string; responseText: string } | null | undefined,
  questionText: string,
  responseText: string
): boolean {
  return Boolean(last && last.questionTextSnapshot === questionText && last.responseText.trim() === responseText.trim());
}

async function transcriptFor(assessmentId: string): Promise<TranscriptTurn[]> {
  const rows = await prisma.questionResponse.findMany({
    where: { assessmentId },
    orderBy: { order: 'asc' },
    select: { order: true, questionTextSnapshot: true, responseText: true },
  });
  return rows.map((r) => ({ order: r.order, question: r.questionTextSnapshot, answer: r.responseText }));
}

// Last-resort questions when every bank scenario for a dimension has already been used. Plain,
// everyday wording — never shown with framework terms.
const FALLBACK_QUESTIONS: Record<string, string[]> = {
  OPENNESS: [
    'If you could learn any skill in a week, what would you pick?',
    'What is something you got curious about recently and looked up on your own?',
    'Would you rather visit a place you love again or somewhere totally new?',
  ],
  CONSCIENTIOUSNESS: [
    'When you have homework and something fun to do, which usually comes first?',
    'How do you keep track of things you need to remember?',
    'What do you do when a task turns out harder than you expected?',
  ],
  EXTRAVERSION: [
    'At a party or family function, where would I usually find you?',
    'Do you prefer one close friend or a big group to hang out with?',
    'How do you feel when you have a whole day with nothing planned and no one around?',
  ],
  AGREEABLENESS: [
    'What do you do when a friend asks for help at a time that is bad for you?',
    'How do you usually handle it when someone in your group is being unfair?',
    'Tell me about a time you helped someone without being asked.',
  ],
  NEUROTICISM: [
    'What usually goes through your mind the night before a big exam?',
    'When something goes wrong, how long does it stay on your mind?',
    'What helps you calm down when you feel stressed?',
  ],
  E_I: [
    'After a busy day, do you want company or some time to yourself?',
    'Do you think better by talking things out or by thinking quietly first?',
    'How do you usually spend a free evening?',
  ],
  S_N: [
    'When you learn something new, do you want the facts first or the big idea first?',
    'Do you enjoy imagining future plans or focusing on what is in front of you?',
    'What kind of instructions do you prefer: step by step, or a rough idea to figure out?',
  ],
  T_F: [
    'When a friend shares a problem, do you first try to fix it or to comfort them?',
    'How do you make a tough choice between two good options?',
    'Would you rather be known as fair or as kind?',
  ],
  J_P: [
    'Do you like to plan your week ahead or decide as you go?',
    'How do you feel when plans change at the last minute?',
    'Do you finish work early or closer to the deadline?',
  ],
};

// Start requests running in this process, keyed per user+mode, so a double-click (or two tabs)
// on Start can't both find "no open attempt" and create two.
const inFlightStarts = new Map<string, Promise<{ assessment: Assessment; resumed: boolean }>>();

/** One open attempt per user: continues the unfinished attempt (with its saved answers) if there
 * is one, otherwise creates a new attempt. Completed attempts and their reports are untouched. */
export function startOrResumeAssessment(userId: string, educationLevel: EducationLevel, isDemo = false) {
  const key = `${userId}:${isDemo}`;
  const running = inFlightStarts.get(key);
  if (running) return running;
  const job = (async () => {
    const open = await prisma.assessment.findFirst({
      where: { userId, isDemo, status: { in: ['IN_PROGRESS', 'PAUSED', 'NOT_STARTED'] }, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (open) return { assessment: open, resumed: true };
    return { assessment: await startAssessment(userId, educationLevel, isDemo), resumed: false };
  })().finally(() => inFlightStarts.delete(key));
  inFlightStarts.set(key, job);
  return job;
}

export async function startAssessment(userId: string, educationLevel: EducationLevel, isDemo = false) {
  const framework = frameworkForEducation(educationLevel);

  const assessment = await prisma.assessment.create({
    data: {
      userId,
      framework,
      educationLevelAtTime: educationLevel,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      isDemo,
      ...APP_VERSION,
      session: { create: { conversationState: {} } },
      progress: { create: { registeredAt: new Date(), startedAt: new Date() } },
    },
    include: { session: true },
  });

  await trackEvent(userId, 'assessment_started', {
    education_level: educationLevel,
    assessment_type: framework,
    assessment_id: assessment.id,
    is_demo: isDemo,
  });

  return assessment;
}

function dimensionsFor(framework: AssessmentFramework): string[] {
  return framework === 'BIG_FIVE' ? [...BIG_FIVE_DIMENSIONS] : MBTI_DIMENSION_PAIRS.map((p) => p.key);
}

/** One real scenario from the seed bank for this dimension — used only as a style/tone
 * reference for Gemini (never shown to the user verbatim), and as the safe fallback text if
 * Gemini is unavailable, in demo mode, or fails. Anything already asked or already offered as
 * an example is skipped, so the conversation never circles back to the same situation. */
async function getExampleScenario(
  framework: AssessmentFramework,
  dimension: string,
  educationLevel: EducationLevel,
  exclude: string[] = []
): Promise<string> {
  const candidates = await prisma.question.findMany({
    where: { framework, dimension, isActive: true, isScenario: true, educationLevels: { has: educationLevel } },
    take: 30,
  });
  const unused = (t: string) => !exclude.includes(t) && !isNearDuplicate(t, exclude);
  const fresh = candidates.map((c) => c.scenarioText).filter(unused);
  let pool = fresh.length > 0 ? fresh : (FALLBACK_QUESTIONS[dimension] ?? []).filter(unused);
  if (pool.length === 0) {
    // This trait's questions are used up — typically because the AI has been unreachable, so no
    // answer was scored and the same trait kept being picked. Borrow an unused question from
    // another trait rather than asking the same thing again.
    const otherDims = dimensionsFor(framework).filter((d) => d !== dimension);
    const others = await prisma.question.findMany({
      where: { framework, dimension: { in: otherDims }, isActive: true, isScenario: true, educationLevels: { has: educationLevel } },
      take: 100,
    });
    pool = [...others.map((c) => c.scenarioText), ...otherDims.flatMap((d) => FALLBACK_QUESTIONS[d] ?? [])].filter(unused);
  }
  if (pool.length === 0) return 'Tell me about something you did recently that you really enjoyed.';
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Every message the assistant has sent so far in this assessment, oldest first. */
async function askedSoFar(assessmentId: string): Promise<string[]> {
  const rows = await prisma.questionResponse.findMany({
    where: { assessmentId },
    orderBy: { order: 'asc' },
    select: { questionTextSnapshot: true },
  });
  return rows.map((r) => r.questionTextSnapshot);
}

/** How many recorded answers have touched each dimension so far, from the actual signals —
 * not from which bank question was picked, since there is no bank question anymore. */
async function computeDimensionCoverage(assessmentId: string, dims: string[]): Promise<Map<string, number>> {
  const responses = await prisma.questionResponse.findMany({
    where: { assessmentId },
    select: { dimensionSignals: true },
  });
  const coverage = new Map<string, number>(dims.map((d) => [d, 0]));
  for (const r of responses) {
    const signals = (r.dimensionSignals as Record<string, number>) ?? {};
    for (const key of Object.keys(signals)) {
      if (coverage.has(key)) coverage.set(key, (coverage.get(key) ?? 0) + 1);
    }
  }
  return coverage;
}

function pickLeastCoveredDimension(dims: string[], coverage: Map<string, number>): string {
  return [...dims].sort((a, b) => (coverage.get(a) ?? 0) - (coverage.get(b) ?? 0))[0];
}

export async function getNextQuestion(assessmentId: string) {
  const assessment = await prisma.assessment.findUniqueOrThrow({
    where: { id: assessmentId },
    include: { session: true, user: true },
  });

  if (assessment.status === 'COMPLETED') return { done: true as const };

  const minRequired = MIN_QUESTIONS_BY_FRAMEWORK[assessment.framework];
  const history = await transcriptFor(assessmentId);
  const responseCount = history.length;
  const state = (assessment.session?.conversationState as ConversationState) ?? {};
  const dims = dimensionsFor(assessment.framework);
  // Everything the client needs to rebuild the screen exactly where the user left off.
  const resumeInfo = { attemptId: assessmentId, status: assessment.status, history, answeredCount: responseCount, minRequired };

  if (state.readyToSubmit || isReadyToSubmit(responseCount, minRequired, await computeDimensionCoverage(assessmentId, dims))) {
    return { done: false as const, readyToSubmit: true as const, ...resumeInfo, progress: 100 };
  }

  // A message was already generated and is still awaiting an answer (e.g. the page was
  // reloaded) — return the same one instead of generating (and paying for) a new one.
  if (state.pendingMessage && state.pendingDimension) {
    return {
      done: false as const,
      readyToSubmit: false as const,
      ...resumeInfo,
      question: { id: state.pendingDimension, text: state.pendingMessage, dimension: state.pendingDimension, isFollowUp: false },
      progress: progressPercent(responseCount, minRequired),
    };
  }

  const educationLevel = assessment.educationLevelAtTime;

  let dimension: string;
  let message: string;
  const examplesOffered: string[] = [];

  if (responseCount === 0) {
    dimension = dims[0];
    const example = await getExampleScenario(assessment.framework, dimension, educationLevel);
    message = example;
    examplesOffered.push(example);
    if (!assessment.isDemo && isGeminiConfigured()) {
      try {
        const opening = await generateStructuredJson(
          buildOpeningMessagePrompt({
            frameworkSystemPrompt: getSystemPromptForFramework(educationLevel),
            dimension,
            exampleScenario: example,
            userName: assessment.user.name,
          }),
          z.object({ next_message: z.string().min(3) }),
          { temperature: 0.75, maxOutputTokens: 300, timeoutMs: 8000 }
        );
        message = stripJudgingOpeners(opening.next_message);
      } catch (err) {
        logger.warn('Opening message generation failed, using example scenario text', { assessmentId, error: String(err) });
      }
    }
  } else {
    // Resuming with existing answers but no stored pending message (conversationState was
    // cleared, or this is older data) — pick up with a fresh scenario for whatever's still
    // least-covered rather than stalling.
    const coverage = await computeDimensionCoverage(assessmentId, dims);
    dimension = pickLeastCoveredDimension(dims, coverage);
    message = await getExampleScenario(assessment.framework, dimension, educationLevel, [
      ...(await askedSoFar(assessmentId)),
      ...(state.usedExamples ?? []),
    ]);
  }

  await prisma.assessmentSession.update({
    where: { assessmentId },
    data: {
      conversationState: {
        pendingDimension: dimension,
        pendingMessage: message,
        dimensionStreak: 1,
        usedExamples: [...(state.usedExamples ?? []), ...examplesOffered, message],
      },
    },
  });

  await trackEvent(assessment.userId, 'assessment_question_viewed', {
    assessment_id: assessmentId,
    dimension,
    question_number: responseCount + 1,
  });

  return {
    done: false as const,
    readyToSubmit: false as const,
    ...resumeInfo,
    question: { id: dimension, text: message, dimension, isFollowUp: false },
    progress: progressPercent(responseCount, minRequired),
  };
}

const turnSchema = z.object({
  dimension_signals: z.record(z.number()),
  confidence: z.number().min(0).max(1),
  reasoning_summary: z.string(),
  next_message: z.string().min(3),
  next_dimension: z.string().min(1),
});

/** Keeps only the framework's own dimensions and clamps each value to its valid range
 * (Big Five 0..1, MBTI -1..1), so a malformed AI reply can't push a score out of bounds. */
export function sanitizeSignals(raw: Record<string, number>, dims: string[], framework: AssessmentFramework): Record<string, number> {
  const [lo, hi] = framework === 'BIG_FIVE' ? [0, 1] : [-1, 1];
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw ?? {})) {
    if (dims.includes(k) && Number.isFinite(v)) out[k] = Math.min(hi, Math.max(lo, v));
  }
  return out;
}

// Demo attempts only: simulated signal, clearly marked as such.
function demoAnalysis(dimension: string) {
  return {
    dimension_signals: { [dimension]: 0.5 + (Math.random() - 0.5) * 0.4 },
    confidence: 0.75,
    reasoning_summary: 'Demo mode: signal simulated without calling the AI provider.',
  };
}

export async function submitResponse(params: {
  assessmentId: string;
  questionText: string;
  responseText: string;
  inputMethod: InputMethod;
  durationMs?: number;
}) {
  const { assessmentId, questionText, responseText, inputMethod, durationMs } = params;

  const assessment = await prisma.assessment.findUniqueOrThrow({
    where: { id: assessmentId },
    include: { session: true, user: true },
  });

  if (assessment.status === 'COMPLETED') {
    throw new AssessmentStateError('This assessment has already been submitted.');
  }

  const dims = dimensionsFor(assessment.framework);
  const educationLevel = assessment.educationLevelAtTime;
  const state = (assessment.session?.conversationState as ConversationState) ?? {};

  // The same answer arriving again (the first request saved but its response never reached
  // the browser, or a double submit) — return what that save produced instead of a new row.
  const lastSaved = await prisma.questionResponse.findFirst({ where: { assessmentId }, orderBy: { order: 'desc' } });
  if (isReplayOfLastTurn(lastSaved, questionText, responseText)) {
    return currentTurnResult(assessmentId, lastSaved!);
  }
  if (state.readyToSubmit) {
    // Enough answers are in; nothing more is asked, so extra answers are not recorded.
    return { response: lastSaved, followUp: null as null, done: true as const };
  }

  // questionText is what the client actually displayed and is answering against — trust it
  // over the stored state if they somehow disagree (state is a convenience cache, not the
  // source of truth for what's on screen).
  const lastMessage = state.pendingMessage || questionText;
  const lastDimension = state.pendingDimension || dims[0];
  const lastDimensionStreak = state.dimensionStreak ?? 1;

  const priorSignals = await prisma.questionResponse.findMany({
    where: { assessmentId },
    select: { dimensionSignals: true },
  });
  const priorAggregate: Record<string, number> = {};
  for (const r of priorSignals) Object.assign(priorAggregate, r.dimensionSignals as Record<string, number>);

  // Recent transcript, so the model can actually reference things said earlier instead of only
  // ever seeing the immediately previous exchange — without this it can't build on anything,
  // which is what made the chat feel like disconnected questions. Capped at 6 exchanges to keep
  // the prompt (and token cost) bounded on long conversations.
  const allExchanges = await prisma.questionResponse.findMany({
    where: { assessmentId },
    orderBy: { order: 'asc' },
    select: { questionTextSnapshot: true, responseText: true },
  });
  const history = allExchanges.slice(-6).map((r) => ({ ai: r.questionTextSnapshot, user: r.responseText }));
  // The full list of what has been asked. Unlike the transcript this is never truncated, so the
  // model (and the duplicate check below) can see questions from the very start of the chat.
  const alreadyAsked = [...allExchanges.map((r) => r.questionTextSnapshot), lastMessage];
  const usedExamples = state.usedExamples ?? [];

  const coverageBefore = await computeDimensionCoverage(assessmentId, dims);
  // The answer being scored this turn hasn't been persisted yet, so coverageBefore doesn't
  // reflect it — without accounting for that, a dimension tied at zero coverage (e.g. turn 1,
  // where everything is still zero) gets suggested again immediately after just being asked.
  // Count this turn's dimension as covered before picking what's next.
  const coverageForSuggestion = new Map(coverageBefore);
  coverageForSuggestion.set(lastDimension, (coverageForSuggestion.get(lastDimension) ?? 0) + 1);
  const suggestedNextDimension = pickLeastCoveredDimension(dims, coverageForSuggestion);
  const nextExample = await getExampleScenario(assessment.framework, suggestedNextDimension, educationLevel, [
    ...alreadyAsked,
    ...usedExamples,
  ]);

  let analysis: { dimension_signals: Record<string, number>; confidence: number; reasoning_summary: string };
  let nextMessage: string | null = null;
  let nextDimension: string = suggestedNextDimension;

  // Only explicit demo attempts get simulated signals. A missing key on a real attempt falls
  // through to the call below, fails, and is recorded unscored — never as a made-up reading.
  if (assessment.isDemo) {
    analysis = demoAnalysis(lastDimension);
  } else {
    try {
      const turn = await generateStructuredJson(
        buildConversationTurnPrompt({
          frameworkSystemPrompt: getSystemPromptForFramework(educationLevel),
          history,
          lastMessage,
          lastAnswer: responseText,
          lastDimension,
          dimensionStreak: lastDimensionStreak,
          priorSignals: priorAggregate,
          suggestedNextDimension,
          exampleScenario: nextExample,
          validDimensions: dims,
          userName: assessment.user.name,
          alreadyAsked,
        }),
        turnSchema,
        { temperature: 0.65, maxOutputTokens: 500, timeoutMs: 9000 }
      );
      analysis = {
        dimension_signals: sanitizeSignals(turn.dimension_signals, dims, assessment.framework),
        confidence: turn.confidence,
        reasoning_summary: turn.reasoning_summary,
      };
      nextMessage = stripJudgingOpeners(turn.next_message);
      nextDimension = dims.includes(turn.next_dimension) ? turn.next_dimension : suggestedNextDimension;
      // Safety net: if the model still repeated (or reworded) an earlier question, swap in a
      // fresh scenario for the least-covered dimension instead of showing the repeat.
      if (isNearDuplicate(nextMessage, alreadyAsked)) {
        logger.warn('Model repeated an earlier question, using a fresh scenario instead', { assessmentId, nextMessage });
        nextMessage = null;
      }
    } catch (err) {
      logger.error('Conversation turn analysis failed, using neutral signal', { assessmentId, error: String(err) });
      // No reading could be taken: record the answer with NO signal and zero confidence, so it
      // cannot move any score. (Previously a random "demo" value was stored here as if real.)
      analysis = { dimension_signals: {}, confidence: 0, reasoning_summary: 'AI analysis unavailable for this answer; not scored.' };
      // nextMessage stays null — falls back to a plain scenario transition below.
    }
  }

  const order = (await prisma.questionResponse.count({ where: { assessmentId } })) + 1;

  let response;
  try {
    response = await prisma.questionResponse.create({
      data: {
        assessmentId,
        questionId: null,
        questionTextSnapshot: lastMessage,
        responseText,
        inputMethod,
        dimensionSignals: analysis.dimension_signals,
        confidence: analysis.confidence,
        aiReasoningSummary: analysis.reasoning_summary,
        followUpNeeded: nextDimension === lastDimension,
        order,
        durationMs,
      },
    });
  } catch (err) {
    // Two submits raced through the AI call together and the other one saved this turn first
    // (unique assessmentId+order) — hand back the result of that save rather than an error.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const winner = await prisma.questionResponse.findUniqueOrThrow({ where: { assessmentId_order: { assessmentId, order } } });
      logger.warn('Concurrent submit for the same turn; returning the saved one', { assessmentId, order });
      return currentTurnResult(assessmentId, winner);
    }
    throw err;
  }

  await trackEvent(assessment.userId, 'assessment_question_answered', {
    assessment_id: assessmentId,
    input_method: inputMethod,
    question_number: order,
  });

  const currentInputMethod = assessment.session?.inputMethodUsed ?? 'TEXT';
  const nextInputMethod =
    order === 1 ? inputMethod : currentInputMethod === inputMethod ? currentInputMethod : 'MIXED';

  // Completion is always decided here, deterministically, from actual recorded coverage —
  // never by asking Gemini whether it thinks the conversation is "done".
  const coverageAfter = await computeDimensionCoverage(assessmentId, dims);
  const minRequired = MIN_QUESTIONS_BY_FRAMEWORK[assessment.framework];
  const done = isReadyToSubmit(order, minRequired, coverageAfter);

  if (done) {
    await prisma.assessmentSession.update({
      where: { assessmentId },
      data: { inputMethodUsed: nextInputMethod, conversationState: { usedExamples, readyToSubmit: true } },
    });
    await updateProgressMilestones(assessmentId, order);
    return { response, followUp: null as null, done: true as const };
  }

  if (!nextMessage) {
    nextMessage = nextExample;
    nextDimension = suggestedNextDimension;
  } else if (!nextMessage.includes('?')) {
    // The model sometimes replies with only a comment and no question, leaving the student nothing
    // to answer. Ask a real question; a neutral comment may stay in front, a judging one may not.
    logger.warn('Model reply had no question, adding a scenario question', { assessmentId, nextMessage });
    nextMessage = JUDGING_OPENER.test(nextMessage.trim()) ? nextExample : `${nextMessage} ${nextExample}`;
    nextDimension = suggestedNextDimension;
  }
  const nextDimensionStreak = nextDimension === lastDimension ? lastDimensionStreak + 1 : 1;

  await prisma.assessmentSession.update({
    where: { assessmentId },
    data: {
      inputMethodUsed: nextInputMethod,
      conversationState: {
        pendingDimension: nextDimension,
        pendingMessage: nextMessage,
        dimensionStreak: nextDimensionStreak,
        usedExamples: [...usedExamples, nextExample],
      },
    },
  });

  await updateProgressMilestones(assessmentId, order);

  return { response, followUp: { id: nextDimension, text: nextMessage }, done: false as const };
}

/** Raised for requests that don't fit the attempt's current state (answering a submitted
 * attempt, submitting before enough answers). Routes turn it into a 409 with this message. */
export class AssessmentStateError extends Error {}
/** The AI couldn't score enough answers to build a real report yet; safe to submit again later. */
export class AnalysisUnavailableError extends Error {}

/** What a just-saved turn led to, read back from the session — used when a submit turns out to
 * be a repeat of one already saved. followUp is null if the other request hasn't finished
 * writing the next message yet; the client then re-reads the attempt state. */
async function currentTurnResult(assessmentId: string, saved: QuestionResponse) {
  const session = await prisma.assessmentSession.findUnique({ where: { assessmentId } });
  const state = (session?.conversationState as ConversationState) ?? {};
  if (state.readyToSubmit) return { response: saved, followUp: null as null, done: true as const };
  const followUp = state.pendingMessage && state.pendingDimension ? { id: state.pendingDimension, text: state.pendingMessage } : null;
  return { response: saved, followUp, done: false as const };
}

function progressPercent(responseCount: number, minRequired: number): number {
  return Math.min(100, Math.round((responseCount / minRequired) * 100));
}

async function updateProgressMilestones(assessmentId: string, responseCount: number) {
  const assessment = await prisma.assessment.findUniqueOrThrow({ where: { id: assessmentId } });
  const minRequired = MIN_QUESTIONS_BY_FRAMEWORK[assessment.framework];
  const pct = progressPercent(responseCount, minRequired);
  const existing = await prisma.assessmentProgress.findUnique({ where: { assessmentId } });
  if (!existing) return;

  const now = new Date();
  const data: { reached25At?: Date; reached50At?: Date; reached75At?: Date } = {};
  if (pct >= 25 && !existing.reached25At) data.reached25At = now;
  if (pct >= 50 && !existing.reached50At) data.reached50At = now;
  if (pct >= 75 && !existing.reached75At) data.reached75At = now;

  if (Object.keys(data).length > 0) {
    await prisma.assessmentProgress.update({ where: { assessmentId }, data });
  }
}

export async function pauseAssessment(assessmentId: string) {
  await prisma.assessment.update({ where: { id: assessmentId }, data: { status: 'PAUSED', pausedAt: new Date() } });
  await prisma.assessmentSession.update({ where: { assessmentId }, data: { pauseCount: { increment: 1 } } });
}

export async function resumeAssessment(assessmentId: string) {
  await prisma.assessment.update({ where: { id: assessmentId }, data: { status: 'IN_PROGRESS', pausedAt: null } });
}

// Submits currently running in this process, so a double-clicked Submit (or two tabs) joins the
// one already generating instead of scoring and writing the report a second time.
const inFlightCompletions = new Map<string, Promise<{ reportId: string; framework: AssessmentFramework }>>();

/** Final submit. Idempotent: an attempt that already has a ready report returns that report.
 * The attempt is only marked COMPLETED after scoring, matching and the report all succeed, so
 * a failure leaves it open with every answer intact and Submit can simply be pressed again. */
export function completeAssessment(assessmentId: string) {
  const running = inFlightCompletions.get(assessmentId);
  if (running) return running;
  const job = runCompletion(assessmentId).finally(() => inFlightCompletions.delete(assessmentId));
  inFlightCompletions.set(assessmentId, job);
  return job;
}

const rescoreSchema = z.object({
  results: z.array(
    z.object({ index: z.number().int(), dimension_signals: z.record(z.number()), confidence: z.number().min(0).max(1) })
  ),
});

/** Answers whose AI reading failed during the chat (e.g. the provider's quota was hit) are saved
 * with no signal, so they would silently drop out of the person's result. One batch call at submit
 * scores them; if it fails too they stay unscored, exactly as before. */
/**
 * Replaces one saved answer from the review screen, before submitting. Its old reading is cleared,
 * so the new wording is scored with the other unscored answers when the assessment is submitted.
 */
export async function editAnswer(assessmentId: string, order: number, responseText: string) {
  const assessment = await prisma.assessment.findUniqueOrThrow({ where: { id: assessmentId } });
  if (assessment.status === 'COMPLETED') {
    throw new AssessmentStateError('This assessment has already been submitted, so its answers can no longer be changed.');
  }
  const existing = await prisma.questionResponse.findUnique({ where: { assessmentId_order: { assessmentId, order } } });
  if (!existing) throw new AssessmentStateError('That answer could not be found. Please refresh the page.');
  if (existing.responseText.trim() === responseText.trim()) return existing;

  return prisma.questionResponse.update({
    where: { id: existing.id },
    data: { responseText, dimensionSignals: {}, confidence: 0, aiReasoningSummary: null },
  });
}

export async function rescoreUnscoredAnswers(assessmentId: string, framework: AssessmentFramework) {
  const all = await prisma.questionResponse.findMany({ where: { assessmentId }, orderBy: { order: 'asc' } });
  const unscored = all.filter((r) => Object.keys((r.dimensionSignals as Record<string, number>) ?? {}).length === 0);
  if (unscored.length === 0) return;

  const dims = dimensionsFor(framework);
  try {
    const { results } = await generateStructuredJson(
      buildAnswerRescoringPrompt({
        answers: unscored.map((r) => ({ question: r.questionTextSnapshot, answer: r.responseText })),
        dimensions: dims,
      }),
      rescoreSchema,
      // One call scores every missed answer; on a busy free tier that can take a while, and the
      // student is already waiting on the report screen.
      { temperature: 0.2, maxOutputTokens: 1500, timeoutMs: 45_000 }
    );
    let rescored = 0;
    for (const res of results) {
      const row = unscored[res.index];
      const signals = row ? sanitizeSignals(res.dimension_signals, dims, framework) : {};
      if (!row || Object.keys(signals).length === 0) continue;
      await prisma.questionResponse.update({
        where: { id: row.id },
        data: { dimensionSignals: signals, confidence: res.confidence, aiReasoningSummary: 'Scored at submit (not available during the chat).' },
      });
      rescored += 1;
    }
    logger.info('Rescored answers that had no reading', { assessmentId, unscored: unscored.length, rescored });
  } catch (err) {
    logger.warn('Could not rescore unscored answers; scoring with the readings available', { assessmentId, unscored: unscored.length, error: String(err) });
  }
}

async function runCompletion(assessmentId: string) {
  const assessment = await prisma.assessment.findUniqueOrThrow({
    where: { id: assessmentId },
    include: { report: true, session: true },
  });

  if (assessment.status === 'COMPLETED' && assessment.report?.status === 'READY') {
    return { reportId: assessment.report.id, framework: assessment.framework };
  }

  const minRequired = MIN_QUESTIONS_BY_FRAMEWORK[assessment.framework];
  const answered = await prisma.questionResponse.count({ where: { assessmentId } });
  const state = (assessment.session?.conversationState as ConversationState) ?? {};
  const coverage = await computeDimensionCoverage(assessmentId, dimensionsFor(assessment.framework));
  if (assessment.status !== 'COMPLETED' && !state.readyToSubmit && !isReadyToSubmit(answered, minRequired, coverage)) {
    throw new AssessmentStateError(`Please answer at least ${minRequired} questions before submitting.`);
  }

  const durationSeconds = assessment.startedAt
    ? Math.round((Date.now() - assessment.startedAt.getTime()) / 1000)
    : null;

  if (!assessment.isDemo && isGeminiConfigured()) await rescoreUnscoredAnswers(assessmentId, assessment.framework);

  // If the AI was down for much of the chat and the rescore above couldn't make up for it, a
  // report now would show every trait at a flat 50 — looks finished, says nothing. Hold it back;
  // the answers stay saved and Submit can simply be pressed again once the AI is reachable.
  if (!assessment.isDemo) {
    const dims = dimensionsFor(assessment.framework);
    const scoredCoverage = await computeDimensionCoverage(assessmentId, dims);
    const scored = await prisma.questionResponse.count({ where: { assessmentId, confidence: { gt: 0 } } });
    if (!hasEnoughScoredAnswers(scored, answered, scoredCoverage)) {
      logger.error('Report held back: too few answers scored by the AI', { assessmentId, scored, answered });
      throw new AnalysisUnavailableError(
        "All your answers are saved, but we couldn't analyse them just now. Please press Submit again in a few minutes."
      );
    }
  }

  // Pipeline: scoring -> career matching -> report (spec §30). Each stage persists its own
  // record (upserts / replace), so re-running after a partial failure is safe.
  const scoreResult = await computeAndPersistPersonalityScore(assessmentId);
  await trackEvent(assessment.userId, 'personality_calculated', {
    assessment_id: assessmentId,
    framework: scoreResult.framework,
  });

  const recommendations = await generateCareerRecommendations(assessmentId);
  await trackEvent(assessment.userId, 'career_recommendations_generated', {
    assessment_id: assessmentId,
    count: recommendations.length,
  });

  const report = await generateReport(assessmentId);
  await trackEvent(assessment.userId, 'report_generated', { assessment_id: assessmentId, report_id: report.id });

  const completedAt = assessment.completedAt ?? new Date();
  await prisma.assessment.update({
    where: { id: assessmentId },
    data: { status: 'COMPLETED', completedAt, durationSeconds: assessment.durationSeconds ?? durationSeconds },
  });
  await prisma.assessmentProgress.update({ where: { assessmentId }, data: { completedAt } }).catch(() => undefined);
  await trackEvent(assessment.userId, 'assessment_completed', {
    assessment_id: assessmentId,
    duration_seconds: durationSeconds,
    assessment_type: assessment.framework,
  });

  return { reportId: report.id, framework: scoreResult.framework };
}
