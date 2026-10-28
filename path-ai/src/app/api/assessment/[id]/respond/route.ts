import { NextResponse } from 'next/server';
import { requireOwnedAssessment } from '@/lib/assessmentAccess';
import { AssessmentStateError, submitResponse } from '@/services/assessmentService';
import { respondSchema } from '@/lib/validation';
import { rateLimit, clientKeyFromRequest } from '@/lib/rateLimit';
import { trackEvent } from '@/services/analyticsService';
import { logger } from '@/lib/logger';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const access = await requireOwnedAssessment(params.id);
  if (!access) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const { allowed } = rateLimit(clientKeyFromRequest(req, `assessment-respond:${access.userId}`));
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Your answer was not saved — please wait a moment and send it again.' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = respondSchema.safeParse(body);
  // questionText is the AI message actually shown on screen that this answer responds to —
  // there is no bank Question row to look up anymore (the conversation is free-form), so this
  // is the only source of truth for what's being answered.
  if (!parsed.success || !body?.questionText) {
    return NextResponse.json({ error: 'Your answer was not saved — please type an answer and send it again.' }, { status: 400 });
  }

  try {
    const result = await submitResponse({
      assessmentId: params.id,
      questionText: body.questionText,
      responseText: parsed.data.responseText,
      inputMethod: parsed.data.inputMethod,
      durationMs: parsed.data.durationMs,
    });

    await trackEvent(access.userId, 'chat_response_submitted', { assessment_id: params.id });

    return NextResponse.json({
      recorded: true,
      answeredCount: result.response?.order ?? 0,
      followUp: result.followUp,
      done: result.done,
    });
  } catch (err) {
    if (err instanceof AssessmentStateError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    // Don't claim "your progress is saved" here: this answer may or may not have been stored.
    // Resending is always safe — submitResponse recognises a repeat of the last saved turn.
    logger.error('Failed to submit response', { assessmentId: params.id, error: String(err) });
    return NextResponse.json(
      { error: 'Your earlier answers are safe, but this answer may not have been saved. Please send it again — it will not be counted twice.' },
      { status: 502 }
    );
  }
}
