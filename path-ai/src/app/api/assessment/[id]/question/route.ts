import { NextResponse } from 'next/server';
import { requireOwnedAssessment } from '@/lib/assessmentAccess';
import { getNextQuestion } from '@/services/assessmentService';
import { logger } from '@/lib/logger';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const access = await requireOwnedAssessment(params.id);
  if (!access) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  try {
    const result = await getNextQuestion(params.id);
    return NextResponse.json(result);
  } catch (err) {
    logger.error('Failed to get next question', { assessmentId: params.id, error: String(err) });
    return NextResponse.json(
      { error: 'The AI is taking longer than expected. Please try again.' },
      { status: 502 }
    );
  }
}
