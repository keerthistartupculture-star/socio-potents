import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMentorCta } from '@/services/mentorService';

// Cheap check the widget calls before deciding whether to render at all — the mentor is only
// offered once a user has a completed report to ground the conversation in (spec: mentor should
// appear after the assessment, not before). Also hands back the CTA up front so a reopened
// widget with existing history can show it immediately, without waiting for a new message.
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ eligible: false, cta: [] });

  const cta = await getMentorCta(userId);
  return NextResponse.json({ eligible: cta.length > 0, cta });
}
