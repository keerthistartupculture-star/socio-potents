import { NextResponse } from 'next/server';
import { requireOwnedAssessment } from '@/lib/assessmentAccess';
import { pauseAssessment } from '@/services/assessmentService';
import { trackEvent } from '@/services/analyticsService';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const access = await requireOwnedAssessment(params.id);
  if (!access) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  await pauseAssessment(params.id);
  await trackEvent(access.userId, 'assessment_paused', { assessment_id: params.id });
  return NextResponse.json({ paused: true });
}
