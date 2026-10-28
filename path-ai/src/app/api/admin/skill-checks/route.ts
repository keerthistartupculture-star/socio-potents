import { NextResponse } from 'next/server';
import { getAdminSession, requireRole } from '@/lib/adminAuth';
import { listModerationQueue } from '@/services/pathwayService';

const TRAINER_ROLES = ['TRAINER', 'ADMIN', 'SUPER_ADMIN'] as const;

export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!requireRole(admin, [...TRAINER_ROLES])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const status = new URL(req.url).searchParams.get('status') === 'MODERATED' ? 'MODERATED' : 'SUBMITTED';
  return NextResponse.json({ items: await listModerationQueue(status) });
}
