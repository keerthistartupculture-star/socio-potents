import { NextResponse } from 'next/server';
import { getAdminSession, requireRole } from '@/lib/adminAuth';
import { runAutomaticRecoverySweep } from '@/services/recoveryService';
import { logger } from '@/lib/logger';

// Same sweep the cron endpoint runs (src/app/api/cron/recovery/route.ts), just triggered
// on-demand by a logged-in admin instead of a scheduler — lets an admin test or force a run
// right now without needing CRON_SECRET.
export async function POST() {
  const admin = await getAdminSession();
  if (!requireRole(admin, ['ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runAutomaticRecoverySweep();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    logger.error('Manual recovery sweep failed', { error: String(err) });
    return NextResponse.json({ error: 'Sweep failed.' }, { status: 500 });
  }
}
