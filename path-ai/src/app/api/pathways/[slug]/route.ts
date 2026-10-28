import { NextResponse } from 'next/server';
import { sessionUserId } from '@/lib/sessionUser';
import { getLearnerView, PathwayError } from '@/services/pathwayService';

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const userId = await sessionUserId();
  if (!userId) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  try {
    return NextResponse.json(await getLearnerView(userId, params.slug));
  } catch (err) {
    if (err instanceof PathwayError) return NextResponse.json({ error: err.message }, { status: 404 });
    throw err;
  }
}
