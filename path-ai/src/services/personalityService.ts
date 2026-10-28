import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { Prisma } from '@prisma/client';
import { BIG_FIVE_DIMENSIONS, MBTI_DIMENSION_PAIRS, type BigFiveDimension, type MbtiDimensionKey } from '@/config/frameworks';

// The scoring engine (spec §7). Gemini (geminiService/assessmentService) only ever extracts
// a per-response dimension_signals + confidence reading from free text. Combining those
// signals into a final personality score is 100% deterministic code, here — Gemini never
// gets to "declare" a final personality type on its own.

export interface DimensionScore {
  score: number; // 0-100
  confidence: number; // 0-1
}

export interface BigFiveResult {
  scores: Record<BigFiveDimension, DimensionScore>;
  overallConfidence: number;
}

export interface MbtiResult {
  poles: Record<MbtiDimensionKey, string>;
  scores: Record<MbtiDimensionKey, DimensionScore>; // score = strength toward the SECOND pole (0-100)
  mbtiType: string;
  overallConfidence: number;
}

interface SignalInput {
  dimension: string;
  signal: number; // Big Five: 0-1 ; MBTI: -1..1 (negative=first pole, positive=second pole)
  weight: number; // question weight
  confidence: number; // AI confidence for this reading, 0-1
}

function weightedAverage(values: { value: number; weight: number }[]): number {
  const totalWeight = values.reduce((sum, v) => sum + v.weight, 0);
  if (totalWeight <= 0) return 0;
  return values.reduce((sum, v) => sum + v.value * v.weight, 0) / totalWeight;
}

export function scoreBigFive(signals: SignalInput[]): BigFiveResult {
  const scores = {} as Record<BigFiveDimension, DimensionScore>;

  for (const dim of BIG_FIVE_DIMENSIONS) {
    const dimSignals = signals.filter((s) => s.dimension === dim);
    if (dimSignals.length === 0) {
      scores[dim] = { score: 50, confidence: 0 };
      continue;
    }
    const score = weightedAverage(
      dimSignals.map((s) => ({ value: s.signal * 100, weight: s.weight * Math.max(s.confidence, 0.1) }))
    );
    const confidence = Math.min(
      1,
      weightedAverage(dimSignals.map((s) => ({ value: s.confidence, weight: s.weight }))) *
        Math.min(1, dimSignals.length / 3)
    );
    scores[dim] = { score: Math.round(clamp(score, 0, 100)), confidence: Number(confidence.toFixed(2)) };
  }

  const overallConfidence = Number(
    (Object.values(scores).reduce((sum, s) => sum + s.confidence, 0) / BIG_FIVE_DIMENSIONS.length).toFixed(2)
  );

  return { scores, overallConfidence };
}

export function scoreMbti(signals: SignalInput[]): MbtiResult {
  const scores = {} as Record<MbtiDimensionKey, DimensionScore>;
  const poles = {} as Record<MbtiDimensionKey, string>;
  let typeString = '';

  for (const pair of MBTI_DIMENSION_PAIRS) {
    const dimSignals = signals.filter((s) => s.dimension === pair.key);
    if (dimSignals.length === 0) {
      scores[pair.key] = { score: 50, confidence: 0 };
      poles[pair.key] = pair.poles[0];
      typeString += pair.poles[0];
      continue;
    }
    // Map -1..1 -> 0..100 strength toward the second pole.
    const raw = weightedAverage(
      dimSignals.map((s) => ({ value: ((s.signal + 1) / 2) * 100, weight: s.weight * Math.max(s.confidence, 0.1) }))
    );
    const confidence = Math.min(
      1,
      weightedAverage(dimSignals.map((s) => ({ value: s.confidence, weight: s.weight }))) *
        Math.min(1, dimSignals.length / 3)
    );
    const clamped = clamp(raw, 0, 100);
    const pole = clamped >= 50 ? pair.poles[1] : pair.poles[0];
    scores[pair.key] = { score: Math.round(clamped), confidence: Number(confidence.toFixed(2)) };
    poles[pair.key] = pole;
    typeString += pole;
  }

  const overallConfidence = Number(
    (Object.values(scores).reduce((sum, s) => sum + s.confidence, 0) / MBTI_DIMENSION_PAIRS.length).toFixed(2)
  );

  return { poles, scores, mbtiType: typeString, overallConfidence };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Aggregates all persisted response signals for an assessment and writes the final PersonalityScore row. */
export async function computeAndPersistPersonalityScore(assessmentId: string) {
  const assessment = await prisma.assessment.findUniqueOrThrow({
    where: { id: assessmentId },
    include: { responses: { include: { question: true } } },
  });

  const signals: SignalInput[] = assessment.responses.flatMap((r) => {
    const raw = (r.dimensionSignals as Record<string, number>) ?? {};
    const weight = r.question?.weight ?? 1;
    return Object.entries(raw).map(([dimension, signal]) => ({
      dimension,
      signal,
      weight,
      confidence: r.confidence,
    }));
  });

  if (assessment.framework === 'BIG_FIVE') {
    const result = scoreBigFive(signals);
    const saved = await prisma.personalityScore.upsert({
      where: { assessmentId },
      create: {
        assessmentId,
        framework: 'BIG_FIVE',
        bigFive: result.scores as unknown as Prisma.InputJsonValue,
        confidenceOverall: result.overallConfidence,
      },
      update: { bigFive: result.scores as unknown as Prisma.InputJsonValue, confidenceOverall: result.overallConfidence },
    });
    logger.info('Big Five score computed', { assessmentId, overallConfidence: result.overallConfidence });
    return { framework: 'BIG_FIVE' as const, result, saved };
  }

  const result = scoreMbti(signals);
  const saved = await prisma.personalityScore.upsert({
    where: { assessmentId },
    create: {
      assessmentId,
      framework: 'MBTI',
      mbti: { poles: result.poles, scores: result.scores } as unknown as Prisma.InputJsonValue,
      mbtiType: result.mbtiType,
      confidenceOverall: result.overallConfidence,
    },
    update: {
      mbti: { poles: result.poles, scores: result.scores } as unknown as Prisma.InputJsonValue,
      mbtiType: result.mbtiType,
      confidenceOverall: result.overallConfidence,
    },
  });
  logger.info('MBTI score computed', { assessmentId, mbtiType: result.mbtiType });
  return { framework: 'MBTI' as const, result, saved };
}
