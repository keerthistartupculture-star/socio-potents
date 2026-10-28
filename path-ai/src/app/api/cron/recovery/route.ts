import { NextResponse } from 'next/server';
import { runAutomaticRecoverySweep } from '@/services/recoveryService';
import { logger } from '@/lib/logger';

// Triggered by an external scheduler (Render Cron Job, Vercel Cron, cron-job.org, etc.) —
// there's no in-process scheduler here, since a Next.js server has no reliable "keep a timer
// running forever" story across deploys/restarts. Secured with a shared secret rather than
// admin session auth, since the caller is a script, not a logged-in browser.
export async function POST(req: Request) {
  const configuredSecret = process.env.CRON_SECRET;
  const provided = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || new URL(req.url).searchParams.get('secret');

  if (!configuredSecret) {
    logger.error('CRON_SECRET is not set — refusing to run the recovery sweep');
    return NextResponse.json({ error: 'Automatic recovery is not configured (CRON_SECRET missing).' }, { status: 503 });
  }
  if (provided !== configuredSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runAutomaticRecoverySweep();
    logger.info('Automatic recovery sweep completed', { ...result });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    logger.error('Automatic recovery sweep failed', { error: String(err) });
    return NextResponse.json({ error: 'Sweep failed.' }, { status: 500 });
  }
}

// Most simple cron pingers (Render Cron via curl, cron-job.org, UptimeRobot) default to GET —
// accept either verb against the same handler rather than forcing a specific one.
export const GET = POST;
