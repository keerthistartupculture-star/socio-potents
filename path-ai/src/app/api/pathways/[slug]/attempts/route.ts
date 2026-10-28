import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sessionUserId } from '@/lib/sessionUser';
import { rateLimit } from '@/lib/rateLimit';
import { PathwayError, submitAttempt } from '@/services/pathwayService';
import { logger } from '@/lib/logger';

const schema = z.object({ taskId: z.string().min(1), response: z.string().max(4000) });

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const userId = await sessionUserId();
  if (!userId) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  if (!rateLimit(`pathway-attempt:${userId}`).allowed) {
    return NextResponse.json({ error: 'Too many submissions — please wait a moment.' }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Your answer could not be read. Please try again.' }, { status: 400 });
  try {
    const attempt = await submitAttempt(userId, params.slug, parsed.data.taskId, parsed.data.response);
    return NextResponse.json({ submitted: true, status: attempt.status });
  } catch (err) {
    if (err instanceof PathwayError) return NextResponse.json({ error: err.message }, { status: 409 });
    logger.error('Pathway attempt failed', { userId, error: String(err) });
    return NextResponse.json({ error: 'Your answer was not saved. Please try again.' }, { status: 500 });
  }
}
