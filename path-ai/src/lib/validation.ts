import { z } from 'zod';

// Central input-validation schemas (spec §22 — SQLi/XSS defense starts at the boundary).

// Optional form fields commonly arrive as '' (an untouched input) rather than undefined —
// coerce blank strings to undefined before the real check runs, so e.g. an empty
// guardianEmail doesn't fail .email() validation just for being unset.
const optionalString = (max: number) =>
  z.preprocess((v) => (v === '' ? undefined : v), z.string().trim().max(max).optional());
const optionalEmail = () =>
  z.preprocess((v) => (v === '' ? undefined : v), z.string().trim().email().optional());

/** Normalises a phone number for checking/storage: spaces, dashes, dots and brackets removed. */
export function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-().]/g, '');
}

/** Indian mobile (10 digits starting 6-9, optional +91 / 91 / 0 prefix) or any international
 * number written with a leading + and 8-15 digits. */
export function isValidPhone(raw: string): boolean {
  const p = normalizePhone(raw);
  return /^(?:\+?91|0)?[6-9]\d{9}$/.test(p) || /^\+\d{8,15}$/.test(p);
}

// Every rule carries the exact sentence shown under its field on the form, so the user is
// told which field is wrong and how to fix it rather than "please check the form".
export const registerSchema = z
  .object({
    name: z.string({ required_error: 'Please enter your full name.' }).trim().min(2, 'Please enter your full name (at least 2 letters).').max(100, 'Name must be 100 characters or fewer.'),
    email: z.string({ required_error: 'Please enter your email address.' }).trim().min(1, 'Please enter your email address.').email('Please enter a valid email address, like name@example.com.').toLowerCase(),
    password: z.string({ required_error: 'Please choose a password (at least 8 characters).' }).min(8, 'Password must be at least 8 characters.').max(128, 'Password must be 128 characters or fewer.'),
    phone: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
      z
        .string()
        .trim()
        .refine(isValidPhone, 'Please enter a valid mobile number, e.g. 98765 43210 or +91 98765 43210.')
        .transform(normalizePhone)
        .optional()
    ),
    age: z.number({ invalid_type_error: 'Age must be a number.' }).int('Age must be a whole number.').min(10, 'Age must be between 10 and 100.').max(100, 'Age must be between 10 and 100.').optional(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
    location: optionalString(200),
    educationLevel: z.enum(['CLASS_10', 'CLASS_12', 'DIPLOMA', 'UNDERGRADUATE', 'POSTGRADUATE', 'WORKING_PROFESSIONAL'], {
      errorMap: () => ({ message: 'Please choose your education level.' }),
    }),
    institutionName: optionalString(200),
    currentClassYear: optionalString(50),
    preferredLanguage: z.string().trim().max(10).default('en'),
    careerGoal: optionalString(500),
    guardianName: optionalString(100),
    guardianEmail: z.preprocess(
      (v) => (v === '' ? undefined : v),
      z.string().trim().email('Please enter a valid parent/guardian email address.').toLowerCase().optional()
    ),
    guardianRelation: optionalString(50),
    consents: z.object({
      dataProcessing: z.literal(true, { errorMap: () => ({ message: 'Please accept the data processing consent to continue.' }) }),
      voiceProcessing: z.boolean().default(false),
      analytics: z.boolean().default(true),
      guardianMinor: z.boolean().optional(),
    }),
  })
  .superRefine((d, ctx) => {
    // Class 10 students are minors: a reachable parent/guardian must be named and must consent.
    if (d.educationLevel !== 'CLASS_10') return;
    if (!d.guardianName || d.guardianName.length < 2) {
      ctx.addIssue({ code: 'custom', path: ['guardianName'], message: "Please enter the parent/guardian's full name." });
    }
    if (!d.guardianEmail) {
      ctx.addIssue({ code: 'custom', path: ['guardianEmail'], message: "Please enter the parent/guardian's email address." });
    } else if (d.guardianEmail === d.email) {
      ctx.addIssue({ code: 'custom', path: ['guardianEmail'], message: "The parent/guardian's email must be different from the student's email." });
    }
    if (!d.guardianRelation) {
      ctx.addIssue({ code: 'custom', path: ['guardianRelation'], message: 'Please say how the guardian is related (e.g. Mother, Father).' });
    }
    if (!d.consents.guardianMinor) {
      ctx.addIssue({ code: 'custom', path: ['consents', 'guardianMinor'], message: 'A parent/guardian must tick the consent box for a Class 10 student.' });
    }
  });

/** Flattens zod issues to { fieldName: firstMessage } for the form (nested consent paths
 * become e.g. "consents.guardianMinor"). */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export const respondSchema = z.object({
  responseText: z.string().trim().min(1).max(5000),
  inputMethod: z.literal('TEXT').default('TEXT'),
  durationMs: z.number().int().min(0).max(600_000).optional(),
});

export const questionUpsertSchema = z.object({
  code: z.string().trim().min(2).max(20),
  framework: z.enum(['BIG_FIVE', 'MBTI']),
  dimension: z.string().trim().min(1).max(30),
  questionType: z.enum(['SCENARIO', 'OPEN_ENDED', 'MULTIPLE_CHOICE', 'VOICE', 'TEXT', 'FOLLOW_UP']),
  scenarioText: z.string().trim().min(5).max(2000),
  isScenario: z.boolean().default(true),
  weight: z.number().min(0.1).max(5).default(1),
  difficulty: z.number().int().min(1).max(5).default(1),
  educationLevels: z.array(
    z.enum(['CLASS_10', 'CLASS_12', 'DIPLOMA', 'UNDERGRADUATE', 'POSTGRADUATE', 'WORKING_PROFESSIONAL'])
  ),
  followUpOfId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const careerUpsertSchema = z.object({
  categoryId: z.string(),
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().min(10).max(3000),
  personalityAlignment: z.record(z.number()).default({}),
  skillsRequired: z.array(z.string()).default([]),
  educationPathway: z.array(z.string()).default([]),
  entryLevelRoles: z.array(z.string()).default([]),
  growthPath: z.array(z.string()).default([]),
  workEnvironment: z.string().max(1000).optional(),
  challenges: z.string().max(1000).optional(),
  futureOutlook: z.string().max(1000).optional(),
  isActive: z.boolean().default(true),
});

export const adminLoginSchema = z.object({
  email: z.string().trim().email(),
  // Trimmed like SEED_ADMIN_PASSWORD in the seed, so a stray space on either side can't lock the admin out.
  password: z.string().trim().min(8),
});

export const mentorMessageSchema = z.object({
  message: z.string().trim().min(1).max(2000),
});

export function safeParseOrNull<T>(schema: z.ZodSchema<T>, data: unknown): T | null {
  const result = schema.safeParse(data);
  return result.success ? result.data : null;
}
