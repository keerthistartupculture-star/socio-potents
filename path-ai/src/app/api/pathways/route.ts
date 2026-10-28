import { NextResponse } from 'next/server';
import { sessionUserId } from '@/lib/sessionUser';
import { enroll, listPathways, PathwayError } from '@/services/pathwayService';

export async function GET() {
  return NextResponse.json({ pathways: await listPathways(await sessionUserId()) });
}

/** The learner chooses a pathway themselves — nothing is assigned from the assessment. */
export async function POST(req: Request) {
  const userId = await sessionUserId();
  if (!userId) return NextResponse.json({ error: 'Please sign in to choose a pathway.' }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (typeof body?.slug !== 'string') return NextResponse.json({ error: 'Pathway is required.' }, { status: 400 });
  try {
    await enroll(userId, body.slug);
    return NextResponse.json({ enrolled: true });
  } catch (err) {
    if (err instanceof PathwayError) return NextResponse.json({ error: err.message }, { status: 404 });
    throw err;
  }
}
