import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOrResumeAssessment } from '@/services/assessmentService';
import { isGeminiConfigured } from '@/services/geminiService';
import { rateLimit, clientKeyFromRequest } from '@/lib/rateLimit';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: 'Please sign in to start an assessment.' }, { status: 401 });

  const { allowed } = rateLimit(clientKeyFromRequest(req, `assessment-start:${userId}`));
  if (!allowed) return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const isDemo = Boolean(body?.isDemo);

  // Without an AI key every answer would go unscored and the report would be meaningless, so
  // refuse up front instead of letting a student spend ten minutes on an assessment.
  if (!isDemo && !isGeminiConfigured()) {
    logger.error('Assessment start refused: GEMINI_API_KEY is not set on the server', { userId });
    return NextResponse.json(
      { error: "The assessment isn't available right now because the AI service isn't set up. Please try again later." },
      { status: 503 }
    );
  }

  try {
    // Pressing Start/Retake again (or double-clicking it) continues the unfinished attempt with
    // its saved answers instead of creating a fresh, empty one beside it.
    const { assessment, resumed } = await startOrResumeAssessment(userId, user.educationLevel, isDemo);
    return NextResponse.json({ assessmentId: assessment.id, framework: assessment.framework, resumed });
  } catch (err) {
    logger.error('Failed to start assessment', { userId, error: String(err) });
    return NextResponse.json({ error: 'Could not start the assessment. Please try again.' }, { status: 500 });
  }
}
