import { NextResponse } from 'next/server';
import { requireOwnedAssessment } from '@/lib/assessmentAccess';
import { AssessmentStateError, editAnswer } from '@/services/assessmentService';
import { editAnswerSchema } from '@/lib/validation';
import { rateLimit, clientKeyFromRequest } from '@/lib/rateLimit';
import { logger } from '@/lib/logger';

/** Edit one answer from the review screen, before submitting. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const access = await requireOwnedAssessment(params.id);
  if (!access) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const { allowed } = rateLimit(clientKeyFromRequest(req, `assessment-edit:${access.userId}`));
  if (!allowed) return NextResponse.json({ error: 'Too many requests. Please wait a moment and save again.' }, { status: 429 });

  const parsed = editAnswerSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Your change was not saved — please type an answer and save again.' }, { status: 400 });
  }

  try {
    const updated = await editAnswer(params.id, parsed.data.order, parsed.data.responseText);
    return NextResponse.json({ saved: true, order: updated.order, answer: updated.responseText });
  } catch (err) {
    if (err instanceof AssessmentStateError) return NextResponse.json({ error: err.message }, { status: 409 });
    logger.error('Failed to edit answer', { assessmentId: params.id, error: String(err) });
    return NextResponse.json({ error: 'Your change was not saved. Please try again.' }, { status: 500 });
  }
}
