import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { trackEvent, type AnalyticsEventName } from '@/services/analyticsService';
import { rateLimit, clientKeyFromRequest } from '@/lib/rateLimit';

// Thin proxy so client components can fire events (e.g. career_clicked) without ever
// holding a Mixpanel token themselves (spec §16).
const ALLOWED_CLIENT_EVENTS: AnalyticsEventName[] = ['career_clicked', 'assessment_restarted'];

export async function POST(req: Request) {
  const { allowed } = rateLimit(clientKeyFromRequest(req, 'analytics-track'));
  if (!allowed) return NextResponse.json({ ok: false }, { status: 429 });

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

  const body = await req.json().catch(() => null);
  if (!body?.event || !ALLOWED_CLIENT_EVENTS.includes(body.event)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await trackEvent(userId, body.event, body.properties ?? {});
  return NextResponse.json({ ok: true });
}
