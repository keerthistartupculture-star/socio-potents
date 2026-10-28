import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { rateLimit, clientKeyFromRequest } from '@/lib/rateLimit';
import { fieldErrorsOf, registerSchema } from '@/lib/validation';
import { trackEvent } from '@/services/analyticsService';

export async function POST(req: Request) {
  const { allowed } = rateLimit(clientKeyFromRequest(req, 'register'));
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please fix the highlighted fields and try again.', fieldErrors: fieldErrorsOf(parsed.error) },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // Minors (Class 10) require guardian details and consent (spec §23) — enforced in registerSchema.

  try {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json(
        {
          error: 'An account with this email already exists.',
          fieldErrors: { email: 'An account with this email already exists. Try logging in instead.' },
        },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        phone: data.phone,
        age: data.age,
        gender: data.gender,
        location: data.location,
        educationLevel: data.educationLevel,
        institutionName: data.institutionName,
        currentClassYear: data.currentClassYear,
        preferredLanguage: data.preferredLanguage,
        careerGoal: data.careerGoal,
        profile: {
          create: {
            guardianName: data.guardianName,
            guardianEmail: data.guardianEmail,
            guardianRelation: data.guardianRelation,
            guardianConsent: Boolean(data.consents.guardianMinor),
            guardianConsentAt: data.consents.guardianMinor ? new Date() : null,
          },
        },
        consents: {
          create: [
            { consentType: 'DATA_PROCESSING', granted: data.consents.dataProcessing },
            { consentType: 'VOICE_PROCESSING', granted: data.consents.voiceProcessing },
            { consentType: 'ANALYTICS', granted: data.consents.analytics },
            ...(data.consents.guardianMinor !== undefined
              ? [{ consentType: 'GUARDIAN_MINOR' as const, granted: data.consents.guardianMinor }]
              : []),
          ],
        },
      },
    });

    await trackEvent(user.id, 'user_registered', { education_level: data.educationLevel });

    return NextResponse.json({ id: user.id, email: user.email });
  } catch (err) {
    logger.error('Registration failed', { error: String(err) });
    // Two near-simultaneous submits can both pass the findUnique check above.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }
    if (err instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json(
        { error: 'We could not reach the database right now. Please try again in a minute.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Something went wrong creating your account. Please try again.' }, { status: 500 });
  }
}
