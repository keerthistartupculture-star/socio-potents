import 'server-only';
import Mixpanel from 'mixpanel';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// Centralized analytics utility (spec §16). All event tracking flows through this module —
// no other file calls Mixpanel directly. Events are also persisted to analytics_events so
// the admin dashboard can query trends without depending on Mixpanel's API/quotas.

const TOKEN = process.env.MIXPANEL_TOKEN;
let mixpanel: Mixpanel.Mixpanel | null = null;
if (TOKEN) mixpanel = Mixpanel.init(TOKEN);

// Keys never forwarded to Mixpanel — avoids sending unnecessary PII (spec §16).
const PII_KEYS = new Set(['email', 'phone', 'name', 'guardianEmail', 'guardianName', 'location']);

function stripPii(properties: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (!PII_KEYS.has(key)) out[key] = value;
  }
  return out;
}

export type AnalyticsEventName =
  | 'user_registered'
  | 'assessment_started'
  | 'assessment_question_viewed'
  | 'assessment_question_answered'
  | 'chat_response_submitted'
  | 'recovery_reminder_sent'
  | 'assessment_paused'
  | 'assessment_resumed'
  | 'assessment_completed'
  | 'personality_calculated'
  | 'career_recommendations_generated'
  | 'report_generated'
  | 'report_viewed'
  | 'report_downloaded'
  | 'career_clicked'
  | 'assessment_restarted'
  | 'admin_login';

const consentCache = new Map<string, { granted: boolean; at: number }>();

async function hasAnalyticsConsent(userId: string | null): Promise<boolean> {
  if (!userId) return true;
  const cached = consentCache.get(userId);
  if (cached && Date.now() - cached.at < 5 * 60_000) return cached.granted;
  const latest = await prisma.consentRecord
    .findFirst({ where: { userId, consentType: 'ANALYTICS' }, orderBy: { createdAt: 'desc' } })
    .catch(() => null);
  const granted = Boolean(latest?.granted);
  consentCache.set(userId, { granted, at: Date.now() });
  return granted;
}

export async function trackEvent(
  userId: string | null,
  event: AnalyticsEventName,
  properties: Record<string, unknown> = {}
) {
  const cleanProps = stripPii(properties);

  try {
    await prisma.analyticsEvent.create({
      data: { userId: userId ?? undefined, eventName: event, properties: cleanProps as Prisma.InputJsonValue },
    });
  } catch (err) {
    logger.error('Failed to persist analytics event', { event, error: String(err) });
  }

  // Third-party analytics only for users who agreed to it at registration (ConsentType ANALYTICS);
  // anonymous events carry no user. The first-party event row above is kept for the app's own
  // progress tracking (e.g. the admin funnel), which is part of providing the service.
  if (mixpanel && (await hasAnalyticsConsent(userId))) {
    try {
      mixpanel.track(event, { distinct_id: userId ?? 'anonymous', ...cleanProps });
    } catch (err) {
      logger.warn('Mixpanel track failed', { event, error: String(err) });
    }
  }
}
