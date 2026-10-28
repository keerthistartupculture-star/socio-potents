import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { generateStructuredJson, isGeminiConfigured } from '@/services/geminiService';
import { buildCareerRecommendationPrompt } from '@/config/prompts/taskPrompts';

// Career matching engine (spec §9). The deterministic structural score both picks AND ranks the
// suggestions, and is the only source of matchScore. Gemini may only write the explanation for a
// career already chosen here: it cannot add careers, drop them, reorder them or set a score.
// matchScore means "how closely the answers line up with traits commonly described for this
// work" — it is not a probability of success, employment or earnings, and is never shown to users
// as a percentage.

const FINAL_RECOMMENDATION_COUNT = 8;

export interface CareerAlignment {
  bigFive?: Record<string, number>; // dimension -> ideal score 0-1
  mbti?: Record<string, number>; // MBTI type -> weight 0-1
}

export function structuralAlignmentScore(
  framework: 'BIG_FIVE' | 'MBTI',
  personality: { bigFive?: Record<string, { score: number }> | null; mbtiType?: string | null },
  alignment: CareerAlignment
): number {
  if (framework === 'BIG_FIVE' && personality.bigFive) {
    const entries = Object.entries(alignment.bigFive ?? {});
    if (entries.length === 0) return 0.5;
    let sum = 0;
    for (const [dim, weight] of entries) {
      const userScore = (personality.bigFive[dim]?.score ?? 50) / 100;
      sum += 1 - Math.abs(userScore - weight);
    }
    return sum / entries.length;
  }

  if (framework === 'MBTI' && personality.mbtiType) {
    const mbtiWeights = alignment.mbti ?? {};
    const direct = mbtiWeights[personality.mbtiType];
    if (direct !== undefined) return direct;
    // Partial credit: fraction of matching letters against the highest-weighted type in the map.
    const entries = Object.entries(mbtiWeights);
    if (entries.length === 0) return 0.5;
    let best = 0;
    for (const [type, weight] of entries) {
      const matches = [...personality.mbtiType].filter((ch, i) => ch === type[i]).length;
      best = Math.max(best, (matches / 4) * weight);
    }
    return best;
  }

  return 0.4;
}

// Plain words for each trait, in the same spirit as the report labels (lib/parentReport).
const BIG_FIVE_PLAIN: Record<string, { high: string; low: string }> = {
  OPENNESS: { high: 'curiosity and new ideas', low: 'familiar, proven ways of working' },
  CONSCIENTIOUSNESS: { high: 'planning and finishing tasks carefully', low: 'staying flexible as plans change' },
  EXTRAVERSION: { high: 'working with and talking to people', low: 'focused, independent work' },
  AGREEABLENESS: { high: 'helping others and teamwork', low: 'direct, independent judgement' },
  NEUROTICISM: { high: 'noticing risks and problems early', low: 'staying calm under pressure' },
};
const MBTI_PLAIN: Record<string, string> = {
  E: 'working with and talking to people',
  I: 'thinking things through independently',
  S: 'practical, hands-on detail',
  N: 'ideas and the big picture',
  T: 'logical problem solving',
  F: 'understanding how people feel',
  J: 'planning and organising',
  P: 'staying flexible and adapting',
};

/**
 * Which tendencies from the answers this career draws on, in plain words — the deterministic
 * reason behind a suggestion. Big Five: dimensions the career weights clearly high or low where
 * the user's answers sit on the same side. MBTI: letters the user's result shares with the
 * career's best-fitting type.
 */
export function alignedTraits(
  framework: 'BIG_FIVE' | 'MBTI',
  personality: { bigFive?: Record<string, { score: number }> | null; mbtiType?: string | null },
  alignment: CareerAlignment
): string[] {
  if (framework === 'BIG_FIVE' && personality.bigFive) {
    return Object.entries(alignment.bigFive ?? {})
      .filter(([dim, ideal]) => BIG_FIVE_PLAIN[dim] && Math.abs(ideal - 0.5) >= 0.15)
      .map(([dim, ideal]) => {
        const user = (personality.bigFive?.[dim]?.score ?? 50) / 100;
        const sameSide = (ideal > 0.5 && user > 0.5) || (ideal < 0.5 && user < 0.5);
        return { dim, ideal, closeness: sameSide ? 1 - Math.abs(user - ideal) : 0 };
      })
      .filter((t) => t.closeness > 0)
      .sort((a, b) => b.closeness - a.closeness)
      .slice(0, 2)
      .map((t) => (t.ideal > 0.5 ? BIG_FIVE_PLAIN[t.dim].high : BIG_FIVE_PLAIN[t.dim].low));
  }
  if (framework === 'MBTI' && personality.mbtiType) {
    const best = Object.entries(alignment.mbti ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!best) return [];
    return [...personality.mbtiType]
      .filter((ch, i) => ch === best[i] && MBTI_PLAIN[ch])
      .slice(0, 2)
      .map((ch) => MBTI_PLAIN[ch]);
  }
  return [];
}

/** The reason shown under a suggestion when no AI explanation is available. */
export function reasonFromTraits(title: string, traits: string[]): string {
  if (traits.length === 0) {
    return `Some tendencies in the answers overlap with ${title}, but not strongly — it is worth a look rather than a clear signal.`;
  }
  const list = traits.length === 2 ? `${traits[0]} and ${traits[1]}` : traits[0];
  const article = /^[aeiou]/i.test(title) ? 'an' : 'a';
  return `The answers showed a leaning towards ${list}, which work as ${article} ${title} often draws on.`;
}

const recSchema = z.object({
  recommendations: z.array(
    z.object({
      career_id: z.string(),
      why_it_fits: z.string(),
      current_strengths: z.array(z.string()).default([]),
      skills_to_develop: z.array(z.string()).default([]),
      challenges: z.string().default(''),
    })
  ),
});

export async function generateCareerRecommendations(assessmentId: string) {
  const assessment = await prisma.assessment.findUniqueOrThrow({ where: { id: assessmentId }, include: { user: true } });

  const [personalityScore, careers, profile] = await Promise.all([
    prisma.personalityScore.findUnique({ where: { assessmentId } }),
    prisma.career.findMany({ where: { isActive: true }, include: { category: true } }),
    prisma.userProfile.findUnique({ where: { userId: assessment.userId } }),
  ]);

  if (!personalityScore) throw new Error('Cannot recommend careers before personality score is computed.');

  const scored = careers
    .map((career) => ({
      career,
      structuralScore: structuralAlignmentScore(
        assessment.framework,
        {
          bigFive: personalityScore.bigFive as Record<string, { score: number }> | null,
          mbtiType: personalityScore.mbtiType,
        },
        (career.personalityAlignment as CareerAlignment) ?? {}
      ),
    }))
    .sort((a, b) => b.structuralScore - a.structuralScore)
    .slice(0, FINAL_RECOMMENDATION_COUNT);

  const personalityInput = {
    bigFive: personalityScore.bigFive as Record<string, { score: number }> | null,
    mbtiType: personalityScore.mbtiType,
  };
  const withTraits = scored.map((s) => ({
    ...s,
    traits: alignedTraits(assessment.framework, personalityInput, (s.career.personalityAlignment as CareerAlignment) ?? {}),
  }));

  const personalitySummary =
    assessment.framework === 'BIG_FIVE'
      ? `Big Five scores: ${JSON.stringify(personalityScore.bigFive)}`
      : `MBTI type: ${personalityScore.mbtiType}, dimension scores: ${JSON.stringify(personalityScore.mbti)}`;

  const userContext = {
    careerGoal: assessment.user.careerGoal,
    educationLevel: assessment.educationLevelAtTime,
    interests: profile?.interests ?? [],
    skills: profile?.skills ?? [],
    workStyle: profile?.workStyle,
    currentRole: profile?.currentRole,
  };

  let explanations = new Map<string, z.infer<typeof recSchema>['recommendations'][number]>();

  if (!assessment.isDemo && isGeminiConfigured()) {
    try {
      const result = await generateStructuredJson(
        buildCareerRecommendationPrompt({
          personalitySummary,
          userContext,
          careers: withTraits.map((s) => ({
            id: s.career.id,
            title: s.career.title,
            description: s.career.description,
            alignedTraits: s.traits,
          })),
        }),
        recSchema,
        { temperature: 0.5, maxOutputTokens: 2048 }
      );
      // Only explanations for careers the engine chose are kept; anything else is ignored.
      const chosen = new Set(withTraits.map((s) => s.career.id));
      explanations = new Map(result.recommendations.filter((r) => chosen.has(r.career_id)).map((r) => [r.career_id, r]));
    } catch (err) {
      logger.warn('Career explanation AI call failed, using deterministic reasons', {
        assessmentId,
        error: String(err),
      });
    }
  }

  const finalList = withTraits.map((s) => {
    const ai = explanations.get(s.career.id);
    return {
      career_id: s.career.id,
      match_score: Math.round(s.structuralScore * 100),
      why_it_fits: ai?.why_it_fits || reasonFromTraits(s.career.title, s.traits),
      aligned_traits: s.traits,
      current_strengths: ai?.current_strengths ?? [],
      skills_to_develop: ai?.skills_to_develop?.length ? ai.skills_to_develop : s.career.skillsRequired.slice(0, 3),
      challenges: ai?.challenges || s.career.challenges || '',
    };
  });

  await prisma.careerRecommendation.deleteMany({ where: { assessmentId } });

  const created = await Promise.all(
    finalList.map((rec, index) =>
      prisma.careerRecommendation.create({
        data: {
          assessmentId,
          careerId: rec.career_id,
          matchScore: rec.match_score,
          reasoning: {
            whyItFits: rec.why_it_fits,
            alignedTraits: rec.aligned_traits,
            basis: 'How closely the answers line up with traits commonly described for this work.',
            challenges: rec.challenges,
          },
          strengths: rec.current_strengths,
          skillGaps: rec.skills_to_develop,
          rank: index + 1,
        },
        include: { career: { include: { category: true } } },
      })
    )
  );

  return created;
}
