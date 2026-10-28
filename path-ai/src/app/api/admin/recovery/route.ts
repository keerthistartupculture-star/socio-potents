import { NextResponse } from 'next/server';
import { getAdminSession, requireRole } from '@/lib/adminAuth';
import { findRecoveryCandidates } from '@/services/recoveryService';
import { isEmailConfigured } from '@/services/notificationService';
import { logger } from '@/lib/logger';

export async function GET() {
  const admin = await getAdminSession();
  if (!requireRole(admin, ['ADMIN', 'SUPER_ADMIN', 'COUNSELOR'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const items = await findRecoveryCandidates();
    return NextResponse.json({ items, emailConfigured: isEmailConfigured() });
  } catch (err) {
    logger.error('Failed to load recovery candidates', { error: String(err) });
    return NextResponse.json({ error: 'Could not load recovery candidates.' }, { status: 500 });
  }
}
