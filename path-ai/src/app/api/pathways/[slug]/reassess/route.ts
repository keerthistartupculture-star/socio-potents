import { NextResponse } from 'next/server';
import { sessionUserId } from '@/lib/sessionUser';
import { PathwayError, startReassessment } from '@/services/pathwayService';

export async function POST(_req: Request, { params }: { params: { slug: string } }) {
  const userId = await sessionUserId();
  if (!userId) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  try {
    await startReassessment(userId, params.slug);
    return NextResponse.json({ started: true });
  } catch (err) {
    if (err instanceof PathwayError) return NextResponse.json({ error: err.message }, { status: 409 });
    throw err;
  }
}
