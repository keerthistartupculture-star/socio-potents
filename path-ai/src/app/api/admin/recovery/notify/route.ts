import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminSession, requireRole } from '@/lib/adminAuth';
import { loadRecoveryItem, sendRecoveryReminder } from '@/services/recoveryService';
import { logger } from '@/lib/logger';

const notifySchema = z.object({
  userId: z.string().min(1),
  bucket: z.enum(['NEVER_STARTED', 'STALLED_IN_PROGRESS', 'REPORT_UNSEEN']),
  assessmentId: z.string().optional(),
  reportId: z.string().optional(),
});

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!requireRole(admin, ['ADMIN', 'SUPER_ADMIN', 'COUNSELOR'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = notifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  try {
    // Always re-derived from the database (never the client body) — see loadRecoveryItem.
    const item = await loadRecoveryItem(parsed.data);
    if (!item) return NextResponse.json({ error: 'That user/assessment/report no longer matches.' }, { status: 404 });

    const result = await sendRecoveryReminder(item);
    return NextResponse.json(result);
  } catch (err) {
    logger.error('Failed to send recovery reminder', { error: String(err), body: parsed.data });
    return NextResponse.json({ error: 'Could not send the reminder.' }, { status: 500 });
  }
}
