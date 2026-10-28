import { NextResponse } from 'next/server';
import { requireOwnedAssessment } from '@/lib/assessmentAccess';
import { AnalysisUnavailableError, AssessmentStateError, completeAssessment } from '@/services/assessmentService';
import { logger } from '@/lib/logger';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const access = await requireOwnedAssessment(params.id);
  if (!access) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  try {
    // Safe to call repeatedly: returns the existing report if this attempt was already submitted.
    const result = await completeAssessment(params.id);
    return NextResponse.json({ completed: true, reportId: result.reportId, framework: result.framework });
  } catch (err) {
    if (err instanceof AssessmentStateError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof AnalysisUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    logger.error('Failed to complete assessment', { assessmentId: params.id, error: String(err) });
    return NextResponse.json(
      {
        error: 'All your answers are saved, but we could not finish building your report. Please press Submit again in a moment.',
      },
      { status: 502 }
    );
  }
}
