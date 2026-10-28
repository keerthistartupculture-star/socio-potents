import { NextResponse } from 'next/server';
import { getAdminSession, requireRole } from '@/lib/adminAuth';
import { getAttemptForModeration, moderateAttempt, moderationSchema, PathwayError } from '@/services/pathwayService';

const TRAINER_ROLES = ['TRAINER', 'ADMIN', 'SUPER_ADMIN'] as const;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminSession();
  if (!requireRole(admin, [...TRAINER_ROLES])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json(await getAttemptForModeration(params.id));
  } catch (err) {
    if (err instanceof PathwayError) return NextResponse.json({ error: err.message }, { status: 404 });
    throw err;
  }
}

/** Trainer confirms the marks. Only after this does the learner see a result for the task. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminSession();
  if (!requireRole(admin, [...TRAINER_ROLES])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = moderationSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Please complete every criterion.' }, { status: 400 });
  }
  try {
    await moderateAttempt(params.id, admin!.adminId, parsed.data);
    return NextResponse.json({ moderated: true });
  } catch (err) {
    if (err instanceof PathwayError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
