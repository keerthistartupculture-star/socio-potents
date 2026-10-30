import 'server-only';
import { prisma } from '@/lib/prisma';
import { getBranding } from '@/lib/branding';
import { sendEmail, isEmailConfigured } from '@/services/notificationService';
import { trackEvent } from '@/services/analyticsService';
import { logger } from '@/lib/logger';

// Drop-off recovery (spec-adjacent: this is the real, in-house version of what the request
// for "an AI cofounder / recovery agent" was actually reaching for — Razorpay's Agent Studio
// recovery agents are built around abandoned *payments*, which this app has none of; the real
// drop-off points here are registration, mid-assessment, and an unread report). Three buckets,
// each found by a plain deterministic query — no AI involved in deciding who's stalled.

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

const STALL_HOURS = {
  NEVER_STARTED: 24,
  STALLED_IN_PROGRESS: 6,
  REPORT_UNSEEN: 2,
} as const;

export type RecoveryBucket = 'NEVER_STARTED' | 'STALLED_IN_PROGRESS' | 'REPORT_UNSEEN';

export interface RecoveryItem {
  key: string; // stable per-row id for the "send reminder" action
  bucket: RecoveryBucket;
  userId: string;
  name: string;
  email: string;
  since: string; // ISO timestamp of the stall point
  assessmentId?: string;
  reportId?: string;
}

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

export async function findRecoveryCandidates(): Promise<RecoveryItem[]> {
  const [neverStarted, stalledInProgress, reportUnseen] = await Promise.all([
    prisma.user.findMany({
      where: {
        deletedAt: null,
        assessments: { none: {} },
        createdAt: { lt: hoursAgo(STALL_HOURS.NEVER_STARTED) },
      },
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: 200,
    }),
    prisma.assessment.findMany({
      where: {
        deletedAt: null,
        status: { in: ['IN_PROGRESS', 'PAUSED'] },
        updatedAt: { lt: hoursAgo(STALL_HOURS.STALLED_IN_PROGRESS) },
      },
      select: { id: true, updatedAt: true, user: { select: { id: true, name: true, email: true } } },
      orderBy: { updatedAt: 'asc' },
      take: 200,
    }),
    prisma.report.findMany({
      where: {
        status: 'READY',
        viewedAt: null,
        generatedAt: { lt: hoursAgo(STALL_HOURS.REPORT_UNSEEN) },
      },
      select: { id: true, generatedAt: true, user: { select: { id: true, name: true, email: true } } },
      orderBy: { generatedAt: 'asc' },
      take: 200,
    }),
  ]);

  const items: RecoveryItem[] = [];

  for (const u of neverStarted) {
    items.push({
      key: `NEVER_STARTED:${u.id}`,
      bucket: 'NEVER_STARTED',
      userId: u.id,
      name: u.name,
      email: u.email,
      since: u.createdAt.toISOString(),
    });
  }

  for (const a of stalledInProgress) {
    items.push({
      key: `STALLED_IN_PROGRESS:${a.id}`,
      bucket: 'STALLED_IN_PROGRESS',
      userId: a.user.id,
      name: a.user.name,
      email: a.user.email,
      since: a.updatedAt.toISOString(),
      assessmentId: a.id,
    });
  }

  for (const r of reportUnseen) {
    items.push({
      key: `REPORT_UNSEEN:${r.id}`,
      bucket: 'REPORT_UNSEEN',
      userId: r.user.id,
      name: r.user.name,
      email: r.user.email,
      since: (r.generatedAt ?? new Date()).toISOString(),
      reportId: r.id,
    });
  }

  return items;
}

function messageFor(item: RecoveryItem, productName: string): { subject: string; text: string } {
  const firstName = item.name.split(' ')[0];
  switch (item.bucket) {
    case 'NEVER_STARTED':
      return {
        subject: `${productName}: your career assessment is waiting`,
        text: `Hi ${firstName},\n\nYou signed up for ${productName} but haven't started your career assessment yet. It's a 10–15 minute chat and ends with a personalized career report.\n\nStart here: ${APP_URL}/assessment/start\n\n— ${productName}`,
      };
    case 'STALLED_IN_PROGRESS':
      return {
        subject: `${productName}: pick up where you left off`,
        text: `Hi ${firstName},\n\nYou're partway through your career assessment. Jump back in and finish it in just a few more minutes to get your personalized report.\n\nContinue: ${APP_URL}/assessment/session/${item.assessmentId}\n\n— ${productName}`,
      };
    case 'REPORT_UNSEEN':
      return {
        subject: `${productName}: your career report is ready`,
        text: `Hi ${firstName},\n\nYour personalized career assessment report is ready.\n\nView it: ${APP_URL}/report/${item.reportId}\n\n— ${productName}`,
      };
  }
}

/**
 * Re-derives a RecoveryItem straight from the database rather than trusting a client-supplied
 * name/email — the admin UI only ever sends back {userId, bucket, assessmentId?, reportId?},
 * so a tampered request can at most pick which bucket/target to notify about, never redirect
 * the email to an address the admin didn't see on screen.
 */
export async function loadRecoveryItem(params: {
  userId: string;
  bucket: RecoveryBucket;
  assessmentId?: string;
  reportId?: string;
}): Promise<RecoveryItem | null> {
  const user = await prisma.user.findFirst({
    where: { id: params.userId, deletedAt: null },
    select: { id: true, name: true, email: true },
  });
  if (!user) return null;

  if (params.bucket === 'STALLED_IN_PROGRESS' && params.assessmentId) {
    const assessment = await prisma.assessment.findFirst({
      where: { id: params.assessmentId, userId: user.id, deletedAt: null },
      select: { id: true, updatedAt: true },
    });
    if (!assessment) return null;
    return {
      key: `STALLED_IN_PROGRESS:${assessment.id}`,
      bucket: 'STALLED_IN_PROGRESS',
      userId: user.id,
      name: user.name,
      email: user.email,
      since: assessment.updatedAt.toISOString(),
      assessmentId: assessment.id,
    };
  }

  if (params.bucket === 'REPORT_UNSEEN' && params.reportId) {
    const report = await prisma.report.findFirst({
      where: { id: params.reportId, userId: user.id },
      select: { id: true, generatedAt: true },
    });
    if (!report) return null;
    return {
      key: `REPORT_UNSEEN:${report.id}`,
      bucket: 'REPORT_UNSEEN',
      userId: user.id,
      name: user.name,
      email: user.email,
      since: (report.generatedAt ?? new Date()).toISOString(),
      reportId: report.id,
    };
  }

  if (params.bucket === 'NEVER_STARTED') {
    return {
      key: `NEVER_STARTED:${user.id}`,
      bucket: 'NEVER_STARTED',
      userId: user.id,
      name: user.name,
      email: user.email,
      since: new Date().toISOString(),
    };
  }

  return null;
}

const COOLDOWN_HOURS = Number(process.env.RECOVERY_COOLDOWN_HOURS || 48);

export interface RecoverySweepResult {
  scanned: number;
  notified: number;
  skippedCooldown: number;
  failed: number;
}

/**
 * The automatic version: scans for candidates and sends a reminder for every one that hasn't
 * already been attempted (successfully or not) for the same person + bucket within the
 * cooldown window. Cooldown state isn't a new table — it's read straight back out of the
 * `recovery_reminder_sent` analytics events sendRecoveryReminder already writes, so a person
 * who's still stalled after the cooldown expires naturally gets a fresh reminder next sweep,
 * and one who resolved the situation (started, resumed, opened their report) simply stops
 * showing up in findRecoveryCandidates() at all.
 */
export async function runAutomaticRecoverySweep(): Promise<RecoverySweepResult> {
  const candidates = await findRecoveryCandidates();
  if (candidates.length === 0) return { scanned: 0, notified: 0, skippedCooldown: 0, failed: 0 };

  const since = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000);
  const recentAttempts = await prisma.analyticsEvent.findMany({
    where: {
      eventName: 'recovery_reminder_sent',
      createdAt: { gt: since },
      userId: { in: [...new Set(candidates.map((c) => c.userId))] },
    },
    select: { userId: true, properties: true },
  });
  const attemptedRecently = new Set(
    recentAttempts.map((e) => `${e.userId}:${(e.properties as Record<string, unknown> | null)?.bucket}`)
  );

  let notified = 0;
  let skippedCooldown = 0;
  let failed = 0;

  for (const item of candidates) {
    const key = `${item.userId}:${item.bucket}`;
    if (attemptedRecently.has(key)) {
      skippedCooldown += 1;
      continue;
    }
    const result = await sendRecoveryReminder(item);
    if (result.sent) notified += 1;
    else failed += 1;
    attemptedRecently.add(key); // don't attempt the same person+bucket twice in one sweep either
  }

  return { scanned: candidates.length, notified, skippedCooldown, failed };
}

export async function sendRecoveryReminder(item: RecoveryItem): Promise<{ sent: boolean; reason?: string }> {
  const branding = await getBranding();
  const { subject, text } = messageFor(item, branding.productName);
  const result = await sendEmail({ to: item.email, subject, text });

  await trackEvent(item.userId, 'recovery_reminder_sent', {
    bucket: item.bucket,
    sent: result.sent,
    assessment_id: item.assessmentId,
    report_id: item.reportId,
  });

  if (!result.sent) {
    logger.info('Recovery reminder logged (not sent — no provider or send failed)', {
      userId: item.userId,
      bucket: item.bucket,
      configured: isEmailConfigured(),
      reason: result.reason,
    });
  }

  return result;
}
