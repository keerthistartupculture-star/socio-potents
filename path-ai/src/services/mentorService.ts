import 'server-only';
import { prisma } from '@/lib/prisma';
import { generateMentorReply, isGeminiConfigured } from '@/services/geminiService';
import { buildMentorSystemPrompt } from '@/config/prompts/taskPrompts';
import { isMinorEducationLevel } from '@/config/frameworks';
import { logger } from '@/lib/logger';
import { firstName, fitLabel, plainList, plainStrengths, plainText, studyApproaches, studyStartingPoint } from '@/lib/parentReport';
import { classifyMessage, crisisReply, guardReply, humanRequestNote } from '@/lib/mentorSafety';

// AI mentor chat (standing chat widget, not part of the assessment interview). One continuous
// conversation per user. Scope and rules: docs/mentor-scope.md. In short, the mentor explains
// results the scoring engine already produced and supports exploration; it never creates scores,
// states career facts beyond the reviewed reference below, or handles a crisis itself — crisis
// messages are answered by fixed text and flagged for a person (lib/mentorSafety).

const HISTORY_LIMIT = 20; // prior messages fed back to Gemini for conversational continuity
const FALLBACK_NOT_CONFIGURED =
  "I'm not fully set up yet — my AI connection isn't configured on this server. Please check back soon!";
const FALLBACK_AI_ERROR = "I'm having trouble thinking that through right now — mind trying again in a moment?";

/** The mentor points back to a real destination in the app after every reply (spec: chats
 * should end up somewhere, not just talk) rather than the AI inventing links, so this is always
 * one of a small set of pages that actually exist and are relevant to a just-assessed student. */
export interface MentorCta {
  label: string;
  href: string;
}

function ctaFor(reportId: string): MentorCta[] {
  return [
    { label: 'View my full report', href: `/report/${reportId}` },
    { label: 'Browse careers', href: '/careers' },
  ];
}

/** Also doubles as the gate for the mentor chat widget — it only makes sense to offer once
 * there's a report to ground it in, so the widget stays hidden for a user who hasn't finished
 * an assessment yet ([] means "not eligible"). */
export async function getMentorCta(userId: string): Promise<MentorCta[]> {
  const report = await prisma.report.findFirst({ where: { userId, status: 'READY' }, select: { id: true } });
  return report ? ctaFor(report.id) : [];
}

export async function listMentorMessages(userId: string) {
  return prisma.mentorMessage.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });
}

// The mentor only ever sees the report in the same plain language the report itself uses — no
// framework name, type code or raw scores — so it has nothing test-like to repeat back.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function summarizeReport(reportJson: any): string {
  const topMatches = (reportJson.careerMatches ?? [])
    .slice(0, 5)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((c: any) => `${c.title} (${fitLabel(c.matchScore)})`)
    .join(', ');
  const profile = reportJson.personalityProfile;
  const strengths = profile ? plainStrengths(profile).map((s) => `${s.label} (${s.level.toLowerCase()})`).join(', ') : '';
  const study = profile ? studyStartingPoint(studyApproaches(profile)) : '';
  return `
Student's most recent completed career assessment report — use this as background knowledge and
refer to it naturally when relevant, but do not just recite it back verbatim:
- Summary: ${plainText(reportJson.executiveSummary)}
- Tendencies that came through in their answers (self-described, not tested skills): ${strengths}
- Study ideas (preferences to try, not a fixed learning style): ${study}
- How those tendencies might show up: ${plainList(reportJson.naturalStrengths).join('; ')}
- Areas to grow: ${plainList(reportJson.developmentAreas).join('; ')}
- Career suggestions to explore (overlap with their answers, NOT a prediction of success): ${topMatches}
- Suggested skills: ${plainList(reportJson.suggestedSkills).join(', ')}`.trim();
}

const REFERENCE_CAREER_LIMIT = 8;

/**
 * Career facts the mentor may use: the careers in the user's report plus any career named in
 * the message, straight from the database (the "approved reference"). futureOutlook is left out
 * on purpose — its demand claims are unsourced. With MENTOR_REVIEWED_CAREERS_ONLY=true, only
 * careers a person has marked reviewed (contentReviewedAt) are used.
 */
export async function careerReference(careerIds: string[], message: string): Promise<string> {
  const reviewedOnly = process.env.MENTOR_REVIEWED_CAREERS_ONLY === 'true';
  const all = await prisma.career.findMany({
    where: { isActive: true, ...(reviewedOnly ? { contentReviewedAt: { not: null } } : {}) },
    include: { category: true },
  });
  const lower = message.toLowerCase();
  const picked = all
    .filter((c) => careerIds.includes(c.id) || (c.title.length > 3 && lower.includes(c.title.toLowerCase())))
    .slice(0, REFERENCE_CAREER_LIMIT);
  if (picked.length === 0) return 'REFERENCE: (no career entries available for this question)';
  return [
    'REFERENCE — the ONLY source you may use for facts about specific careers:',
    ...picked.map((c) =>
      [
        `## ${c.title} (${c.category.name})${c.contentReviewedAt ? '' : ' [not yet reviewed by our team]'}`,
        `What it is: ${c.description}`,
        `Skills used: ${c.skillsRequired.join(', ')}`,
        `Typical routes in: ${(c.educationPathway as string[]).join(' → ')}`,
        `Entry roles: ${c.entryLevelRoles.join(', ')}`,
        c.workEnvironment ? `Work setting: ${c.workEnvironment}` : '',
        c.challenges ? `Challenges: ${c.challenges}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    ),
  ].join('\n\n');
}

/**
 * Chat history for the model, oldest first. Crisis turns (the student's message and the fixed
 * reply after it) are removed so they never reach the AI provider, even on later turns. The
 * result always starts with a user turn, as the Gemini chat API requires.
 */
export function buildModelHistory(messages: { role: 'USER' | 'ASSISTANT'; content: string; flagReason?: string | null }[]) {
  const out: { role: 'user' | 'model'; text: string }[] = [];
  let skipNextReply = false;
  for (const m of messages) {
    if (m.role === 'USER' && m.flagReason === 'CRISIS') {
      skipNextReply = true;
      continue;
    }
    if (m.role === 'ASSISTANT' && skipNextReply) {
      skipNextReply = false;
      continue;
    }
    skipNextReply = false;
    out.push({ role: m.role === 'USER' ? 'user' : 'model', text: m.content });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

async function getLatestReadyReport(userId: string) {
  return prisma.report.findFirst({ where: { userId, status: 'READY' }, orderBy: { generatedAt: 'desc' } });
}

export async function sendMentorMessage(userId: string, rawMessage: string): Promise<{ reply: string; cta: MentorCta[] }> {
  const message = rawMessage.trim();
  if (!message) throw new Error('Message cannot be empty.');

  const kind = classifyMessage(message);

  const [user, recentHistory, report] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.mentorMessage.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: HISTORY_LIMIT }),
    getLatestReadyReport(userId),
  ]);
  const reportContext = report
    ? summarizeReport(report.reportJson)
    : 'This student has not completed a career assessment yet, so no report context is available. You can still chat generally about careers, study habits, and decisions — encourage them to take the assessment if they ask about their specific career fit.';
  const history = buildModelHistory(recentHistory.reverse());

  const isMinor = isMinorEducationLevel(user.educationLevel);
  const userMessage = await prisma.mentorMessage.create({
    data: { userId, role: 'USER', content: message, flagReason: kind === 'OK' ? null : kind },
  });

  // Possible crisis: never sent to the AI. Fixed reply + flagged for a person to follow up.
  if (kind === 'CRISIS') {
    logger.warn('Mentor crisis message flagged for review', { userId, messageId: userMessage.id });
    const reply = crisisReply(isMinor);
    await prisma.mentorMessage.create({ data: { userId, role: 'ASSISTANT', content: reply } });
    return { reply, cta: [] };
  }

  const careerIds = ((report?.reportJson as { careerMatches?: { careerId: string }[] } | null)?.careerMatches ?? []).map((c) => c.careerId);
  const reference = await careerReference(careerIds, message);

  let reply: string;
  if (!isGeminiConfigured()) {
    reply = FALLBACK_NOT_CONFIGURED;
  } else {
    try {
      // First name only: the model needs a name to be friendly, not the full identity.
      const raw = plainText(await generateMentorReply({
        systemPrompt: buildMentorSystemPrompt({
          userName: firstName(user.name),
          reportContext: `${reportContext}\n\n${reference}`,
          isMinor,
        }),
        history,
        message,
      }));
      const guarded = guardReply(raw);
      reply = guarded.text;
      if (guarded.violations.length > 0) {
        logger.warn('Mentor reply broke a rule; sentences removed', { userId, violations: guarded.violations });
        if (kind === 'OK') {
          await prisma.mentorMessage.update({ where: { id: userMessage.id }, data: { flagReason: 'OUTPUT_GUARD' } });
        }
      }
    } catch (err) {
      logger.error('Mentor chat AI call failed', { userId, error: String(err) });
      reply = FALLBACK_AI_ERROR;
    }
  }

  if (kind === 'HUMAN_REQUESTED') reply = `${reply}\n\n${humanRequestNote()}`;

  await prisma.mentorMessage.create({ data: { userId, role: 'ASSISTANT', content: reply } });
  return { reply, cta: report ? ctaFor(report.id) : [] };
}
