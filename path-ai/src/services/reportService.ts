import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { generateStructuredJson, isGeminiConfigured } from '@/services/geminiService';
import { buildReportNarrativePrompt } from '@/config/prompts/taskPrompts';
import { isMinorEducationLevel } from '@/config/frameworks';
import { renderReportPdf } from '@/services/pdfService';
import { audienceCopy, audienceForEducation, type ReportAudience } from '@/lib/parentReport';

// Report pipeline (spec §30): personality -> strengths -> interests -> career matching
// (already done by earlier stages) -> AI narrative -> structured Report JSON -> PDF. The
// JSON is persisted so a report can be regenerated/re-rendered without re-running the
// assessment (spec §11/§30).

const learningStyleSchema = z
  .object({
    type: z.string().default('Study ideas to try'),
    description: z.string().default(''),
    study_tips: z.array(z.string()).default([]),
  })
  .default({});

const narrativeSchema = z.object({
  executive_summary: z.string(),
  personality_analysis: z.string().default(''),
  natural_strengths: z.array(z.string()),
  development_areas: z.array(z.string()),
  learning_style: learningStyleSchema,
  parent_tips: z.array(z.string()).default([]),
  work_study_style: z.object({
    how_they_learn: z.string(),
    how_they_solve_problems: z.string(),
    how_they_communicate: z.string(),
    how_they_work_with_others: z.string(),
    how_they_make_decisions: z.string(),
  }),
  suggested_skills: z.array(z.string()),
  suggested_activities: z.array(z.string()),
  career_risks_considerations: z.string(),
  action_plan_30_60_90: z.object({
    day_30: z.array(z.string()),
    day_60: z.array(z.string()),
    day_90: z.array(z.string()),
  }),
});

interface LearningStyle {
  type: string;
  description: string;
  study_tips: string[];
}

// Deterministic study ideas from preferences in the answers. Used as the grounding hint for the AI
// narrative and as the fallback if the AI call fails. Wording is deliberately cautious: these are
// methods worth trying first, never a fixed "learning style" (which evidence does not support).
function deriveLearningStyle(
  framework: 'BIG_FIVE' | 'MBTI',
  score: { bigFive: unknown; mbtiType: string | null }
): LearningStyle {
  if (framework === 'MBTI') {
    const type = (score.mbtiType ?? 'INTP').toUpperCase();
    const isIntuitive = type[1] === 'N';
    const isExtravert = type[0] === 'E';
    const label = 'Study ideas to try';
    const description =
      `The answers suggest a preference for ${
        isIntuitive
          ? 'starting from the big picture — how ideas connect'
          : 'starting from concrete examples and practice'
      }, and for ${
        isExtravert ? 'talking things through with others' : 'reading and quiet thinking time'
      }. These are good methods to try first; mixing methods usually works best.`;
    const tips = [
      isIntuitive
        ? 'Map each topic into a diagram or mind-map showing how the pieces connect'
        : 'Learn through worked examples and practice problems before reading theory',
      isExtravert
        ? 'Explain what you have learned out loud, ideally to a study partner'
        : 'Rewrite what you learned in your own words in a structured summary',
      isIntuitive
        ? 'Start from the overall picture, then fill in the details'
        : 'Break topics into small, concrete, ordered steps and do them',
      'Review with short active recall sessions rather than passive re-reading',
    ];
    return { type: label, description, study_tips: tips };
  }

  const bf = (score.bigFive ?? {}) as Record<string, { score?: number }>;
  const at = (k: string) => bf[k]?.score ?? 50;
  const openness = at('OPENNESS');
  const conscientiousness = at('CONSCIENTIOUSNESS');
  const extraversion = at('EXTRAVERSION');

  const options: { type: string; weight: number; tips: string[] }[] = [
    {
      type: 'Visual learner',
      weight: openness,
      tips: [
        'Turn topics into diagrams, mind-maps and flowcharts before memorising them',
        'Use colour-coding and highlight the key ideas so they stand out',
        'Watch a short explainer, then redraw the idea from memory',
      ],
    },
    {
      type: 'Reading/Writing learner',
      weight: conscientiousness,
      tips: [
        'Rewrite class notes in your own words the same day',
        'Make structured chapter summaries and checklists',
        'Practise by writing full answers, not just re-reading',
      ],
    },
    {
      type: 'Auditory learner',
      weight: extraversion,
      tips: [
        'Explain each topic out loud as if teaching a friend',
        'Study with a small group and talk problems through',
        'Record yourself summarising a topic and replay it while revising',
      ],
    },
  ];
  const kinesthetic = {
    type: 'Kinesthetic (hands-on) learner',
    weight: 100 - Math.max(openness, conscientiousness, extraversion),
    tips: [
      'Learn by doing — experiments, worked examples, small build projects',
      'Study in short active bursts with movement breaks',
      'Anchor every concept to a real-world example or practice task',
    ],
  };
  const ranked = [...options, kinesthetic].sort((a, b) => b.weight - a.weight);
  const [top, second] = ranked;
  const blended = top.weight - second.weight < 8;
  const METHOD: Record<string, string> = {
    'Visual learner': 'pictures, diagrams and videos',
    'Reading/Writing learner': 'reading and writing notes',
    'Auditory learner': 'talking ideas through',
    'Kinesthetic (hands-on) learner': 'hands-on practice',
  };
  const description = blended
    ? `The answers point to ${METHOD[top.type]} and ${METHOD[second.type]} as good methods to try first. Mixing methods usually works best, so these are starting points rather than rules.`
    : `The answers point to ${METHOD[top.type]} as a good method to try first. Mixing it with other methods usually works best.`;
  return { type: 'Study ideas to try', description, study_tips: [...top.tips.slice(0, 2), ...second.tips.slice(0, 1)] };
}

function learningStyleHintText(style: LearningStyle): string {
  return `type: ${style.type}. basis: ${style.description} suggested tips: ${style.study_tips.join('; ')}`;
}

// Plain-language reads of each result, used when the AI narrative is unavailable so the fallback
// report still describes THIS person rather than one fixed paragraph for everyone.
interface TraitRead {
  analysis: string;
  strength: string;
  growth: string;
}

const MBTI_READS: Record<string, TraitRead> = {
  E: { analysis: 'gets energy from being around people and often thinks out loud', strength: 'Builds rapport and gets people talking', growth: 'Leaving some quiet time to reflect before deciding' },
  I: { analysis: 'recharges with quiet time and likes to think things through before speaking', strength: 'Focuses deeply and works well independently', growth: 'Sharing ideas earlier, before they feel finished' },
  S: { analysis: 'trusts concrete facts, real examples and methods that are proven to work', strength: 'Pays close attention to detail and accuracy', growth: 'Stepping back now and then to look at the bigger picture' },
  N: { analysis: 'looks for the big picture, patterns and new possibilities', strength: 'Comes up with fresh ideas and sees how things connect', growth: 'Turning big ideas into small, concrete next steps' },
  T: { analysis: 'tends to decide by weighing logic and evidence', strength: 'Thinks clearly and fairly about problems', growth: 'Checking how a decision will feel for the people affected' },
  F: { analysis: 'tends to decide with people and personal values in mind', strength: 'Understands how others feel and keeps the team together', growth: 'Weighing the facts as well as feelings in tough calls' },
  J: { analysis: 'likes to plan ahead, stay organised and finish what they start', strength: 'Plans well and follows through', growth: 'Staying flexible when plans change' },
  P: { analysis: 'likes to keep options open and adapt as things change', strength: 'Adapts quickly and stays open to new information', growth: 'Setting small deadlines so tasks get finished' },
};

const BIG_FIVE_READS: Record<string, { high: TraitRead; low: TraitRead }> = {
  OPENNESS: {
    high: { analysis: 'is curious and enjoys new ideas and creative activities', strength: 'Curious and imaginative', growth: 'Finishing one idea before jumping to the next' },
    low: { analysis: 'prefers familiar, practical approaches', strength: 'Practical and down-to-earth', growth: 'Trying one new kind of activity now and then' },
  },
  CONSCIENTIOUSNESS: {
    high: { analysis: 'is organised and likes to do things properly', strength: 'Organised and reliable', growth: 'Not being too hard on themselves when things go wrong' },
    low: { analysis: 'is flexible and spontaneous rather than tightly planned', strength: 'Flexible and easy-going', growth: 'Using simple checklists to keep track of tasks' },
  },
  EXTRAVERSION: {
    high: { analysis: 'enjoys being around people and is energised by activity', strength: 'Outgoing and easy to talk to', growth: 'Making time for quiet, focused work' },
    low: { analysis: 'prefers smaller groups and quiet time to recharge', strength: 'Thoughtful and a good listener', growth: 'Speaking up in groups when they have a good idea' },
  },
  AGREEABLENESS: {
    high: { analysis: 'is caring and cooperative with others', strength: 'Kind and works well in a team', growth: 'Saying no politely when something does not feel right' },
    low: { analysis: 'is direct and willing to question things', strength: 'Honest and independent-minded', growth: 'Listening fully before disagreeing' },
  },
  NEUROTICISM: {
    high: { analysis: 'feels things strongly and can worry under pressure', strength: 'Takes things seriously and cares about doing well', growth: 'Learning a few simple ways to stay calm under pressure' },
    low: { analysis: 'usually stays calm under pressure', strength: 'Calm and steady', growth: 'Noticing when others around them are stressed' },
  },
};

function readAbout(reads: TraitRead[], topic: RegExp, otherwise: string): string {
  const hit = reads.find((r) => topic.test(r.analysis));
  return hit ? `${hit.analysis.charAt(0).toUpperCase()}${hit.analysis.slice(1)}.` : otherwise;
}

export function traitReads(
  framework: 'BIG_FIVE' | 'MBTI',
  score: { bigFive: unknown; mbtiType: string | null }
): TraitRead[] {
  if (framework === 'MBTI') {
    return (score.mbtiType ?? '').toUpperCase().split('').map((l) => MBTI_READS[l]).filter(Boolean);
  }
  const bf = (score.bigFive ?? {}) as Record<string, { score?: number; confidence?: number }>;
  // Only results that clearly lean one way are described; middling ones say nothing reliable.
  return Object.entries(BIG_FIVE_READS)
    .map(([dim, reads]) => ({ s: bf[dim]?.score ?? 50, reads }))
    .filter(({ s }) => s >= 60 || s <= 40)
    .sort((a, b) => Math.abs(b.s - 50) - Math.abs(a.s - 50))
    .map(({ s, reads }) => (s >= 60 ? reads.high : reads.low));
}

function fallbackNarrative(
  name: string,
  topCareerTitles: string[],
  learningStyle: LearningStyle,
  audience: ReportAudience,
  reads: TraitRead[]
) {
  const top = topCareerTitles[0] ?? 'their top-suggested field';
  const professional = audience === 'PROFESSIONAL';
  const [r1, r2, r3, r4] = reads;
  const personalityAnalysis = reads.length
    ? `From ${name}'s answers, ${name} ${r1.analysis}${r2 ? `, and ${r2.analysis}` : ''}.${
        r3 ? ` ${name} also ${r3.analysis}${r4 ? `, and ${r4.analysis}` : ''}.` : ''
      } These are everyday tendencies drawn from ${name}'s answers, not fixed labels.`
    : `${name}'s answers did not lean clearly in any one direction, which often means someone adapts to the situation. These are everyday tendencies, not fixed labels.`;
  return {
    executive_summary: professional
      ? `This report shows the tendencies that came through in ${name}'s answers, some study and learning ideas, and career directions that may be worth exploring. Use it as one input when reflecting on next steps, not a final decision.`
      : `This report shows the tendencies that came through in ${name}'s answers, study ideas worth trying, and career areas that may be worth exploring. Use it as a friendly starting point for conversations, not a final decision.`,
    personality_analysis: personalityAnalysis,
    natural_strengths: reads.length ? reads.map((r) => r.strength) : ['Adapts to different situations'],
    development_areas: [...reads.slice(0, 2).map((r) => r.growth), `Getting more hands-on experience in areas like ${top}`],
    learning_style: {
      type: learningStyle.type,
      description: learningStyle.description,
      study_tips: learningStyle.study_tips,
    },
    parent_tips: professional
      ? [
          `Ask a colleague or mentor which of these tendencies they notice in ${name}'s work`,
          `Find one person working as a ${top} and ask about a typical week`,
          `Pick one small project at work that uses a skill from this report`,
          `Set a monthly check-in with yourself on what you have tried`,
        ]
      : [
          `Ask ${name} to explain one thing they learned today — teaching it back helps it stick`,
          `Notice and praise effort, not just marks`,
          `Watch a short video or visit a workplace related to ${top} together`,
          `Agree on a simple weekly study timetable with ${name}`,
        ],
    work_study_style: {
      how_they_learn: learningStyle.description,
      how_they_solve_problems: readAbout(reads, /facts|big picture|practical|curious/, 'Works through problems by weighing a few options first.'),
      how_they_communicate: readAbout(reads, /out loud|before speaking|people around|smaller groups|direct/, 'Adjusts how they explain things to who they are talking to.'),
      how_they_work_with_others: readAbout(reads, /caring|cooperative|being around people|recharges|quiet time/, 'Works with others and on their own.'),
      how_they_make_decisions: readAbout(reads, /decide|plan ahead|options open|organised|spontaneous/, 'Thinks about what is practical and what feels right before deciding.'),
    },
    suggested_skills: ['Communication', 'Problem solving', `Basic skills for ${top} work`],
    suggested_activities: [`A short project or workshop related to ${top}`, 'Talking to someone who works in that field', professional ? 'A short course or certification in a related skill' : 'A beginner online course'],
    career_risks_considerations: `Career choices depend on many things beyond this report, like interests that grow over time and the opportunities available. Treat this as one helpful input among several.`,
    action_plan_30_60_90: {
      day_30: [`Read about ${name}'s top 3 career suggestions`],
      day_60: ['Talk to one person who works in a suggested field'],
      day_90: [`Try a small project, course or activity linked to ${top}`],
    },
  };
}

function roadmapFor(educationLevel: string, topCareer: string): string[] {
  switch (educationLevel) {
    case 'CLASS_10':
      return ['Class 10', 'Pick a Class 11/12 stream that keeps these options open', 'Relevant undergraduate degree', 'Build core skills', 'Internships', `First role in/around ${topCareer}`];
    case 'CLASS_12':
      return ['Pick a degree or course that keeps these options open', 'Build core & digital skills', 'Certifications', 'Internship', `Entry role in ${topCareer}`];
    case 'DIPLOMA':
    case 'UNDERGRADUATE':
    case 'POSTGRADUATE':
      return ['Current degree', 'Targeted skill-building', 'Internship', 'Portfolio projects', `Entry role in ${topCareer}`, 'Career growth'];
    case 'WORKING_PROFESSIONAL':
    default:
      return ['Current role', 'Identify skill gaps', `Target role: ${topCareer}`, 'Structured learning plan', 'Career transition', 'Long-term goal'];
  }
}

export async function generateReport(assessmentId: string) {
  const assessment = await prisma.assessment.findUniqueOrThrow({
    where: { id: assessmentId },
    include: { user: true },
  });
  const [personalityScore, recommendations] = await Promise.all([
    prisma.personalityScore.findUniqueOrThrow({ where: { assessmentId } }),
    prisma.careerRecommendation.findMany({
      where: { assessmentId },
      orderBy: { rank: 'asc' },
      include: { career: { include: { category: true } } },
    }),
  ]);

  const report = await prisma.report.upsert({
    where: { assessmentId },
    create: { assessmentId, userId: assessment.userId, reportJson: {}, status: 'GENERATING' },
    update: { status: 'GENERATING' },
  });

  const personalitySummary =
    assessment.framework === 'BIG_FIVE'
      ? `Big Five: ${JSON.stringify(personalityScore.bigFive)}`
      : `MBTI: ${personalityScore.mbtiType} — ${JSON.stringify(personalityScore.mbti)}`;
  const topCareerTitles = recommendations.map((r) => r.career.title);
  const learningStyle = deriveLearningStyle(assessment.framework, {
    bigFive: personalityScore.bigFive,
    mbtiType: personalityScore.mbtiType,
  });

  const reads = traitReads(assessment.framework, { bigFive: personalityScore.bigFive, mbtiType: personalityScore.mbtiType });

  const studentFirstName = (assessment.user.name ?? '').trim().split(/\s+/)[0] || 'Your child';
  const audience = audienceForEducation(assessment.educationLevelAtTime);

  let narrative;
  if (!assessment.isDemo && isGeminiConfigured()) {
    try {
      narrative = await generateStructuredJson(
        buildReportNarrativePrompt({
          educationLevel: assessment.educationLevelAtTime,
          framework: assessment.framework,
          personalitySummary,
          topCareers: topCareerTitles,
          userContext: { careerGoal: assessment.user.careerGoal },
          learningStyleHint: learningStyleHintText(learningStyle),
          studentFirstName,
          audience,
        }),
        narrativeSchema,
        { temperature: 0.6, maxOutputTokens: 2048 }
      );
      // Guard against a thin/empty AI learning_style — fall back to the deterministic read.
      if (!narrative.learning_style?.description || narrative.learning_style.study_tips.length === 0) {
        narrative.learning_style = learningStyle;
      }
    } catch (err) {
      logger.warn('Report narrative AI generation failed, using fallback template', {
        assessmentId,
        error: String(err),
      });
      narrative = fallbackNarrative(studentFirstName, topCareerTitles, learningStyle, audience, reads);
    }
  } else {
    narrative = fallbackNarrative(studentFirstName, topCareerTitles, learningStyle, audience, reads);
  }

  const reportJson = {
    meta: {
      assessmentId,
      userId: assessment.userId,
      studentName: assessment.user.name,
      assessmentDate: assessment.completedAt ?? new Date(),
      assessmentType: assessment.framework,
      educationLevel: assessment.educationLevelAtTime,
      reportVersion: '2.0.0',
      audience,
      isMinor: isMinorEducationLevel(assessment.educationLevelAtTime),
    },
    executiveSummary: narrative.executive_summary,
    personalityAnalysis: narrative.personality_analysis,
    personalityProfile: {
      framework: assessment.framework,
      bigFive: personalityScore.bigFive,
      mbti: personalityScore.mbti,
      mbtiType: personalityScore.mbtiType,
      confidenceOverall: personalityScore.confidenceOverall,
    },
    naturalStrengths: narrative.natural_strengths,
    developmentAreas: narrative.development_areas,
    learningStyle: narrative.learning_style,
    parentTips: narrative.parent_tips,
    workStudyStyle: narrative.work_study_style,
    careerMatches: recommendations.map((r) => ({
      careerId: r.careerId,
      title: r.career.title,
      category: r.career.category.name,
      matchScore: r.matchScore,
      reasoning: r.reasoning,
      strengths: r.strengths,
      skillGaps: r.skillGaps,
      educationPathway: r.career.educationPathway,
      entryLevelRoles: r.career.entryLevelRoles,
      growthPath: r.career.growthPath,
      workEnvironment: r.career.workEnvironment,
    })),
    careerRoadmap: roadmapFor(assessment.educationLevelAtTime, topCareerTitles[0] ?? 'your matched field'),
    suggestedSkills: narrative.suggested_skills,
    suggestedActivities: narrative.suggested_activities,
    careerRisksConsiderations: narrative.career_risks_considerations,
    actionPlan: narrative.action_plan_30_60_90,
    disclaimer: audienceCopy(audience, studentFirstName).disclaimer,
  };

  const updated = await prisma.report.update({
    where: { assessmentId },
    data: {
      reportJson,
      status: 'READY',
      personalityResultLabel: assessment.framework === 'MBTI' ? personalityScore.mbtiType : 'Big Five profile',
      generatedAt: new Date(),
    },
  });

  try {
    const pdfPath = await renderReportPdf(updated.id, reportJson);
    return prisma.report.update({ where: { id: updated.id }, data: { pdfPath } });
  } catch (err) {
    logger.error('PDF rendering failed; report JSON is still available', { reportId: updated.id, error: String(err) });
    return updated;
  }
}
