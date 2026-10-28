import type { EducationLevel, AssessmentFramework } from '@prisma/client';

// Single source of truth for "which personality framework applies to which education level"
// (spec §2). Everything else (question filtering, scoring, prompts) reads from here.

export const FRAMEWORK_BY_EDUCATION: Record<EducationLevel, AssessmentFramework> = {
  CLASS_10: 'BIG_FIVE',
  CLASS_12: 'MBTI',
  DIPLOMA: 'MBTI',
  UNDERGRADUATE: 'MBTI',
  POSTGRADUATE: 'MBTI',
  WORKING_PROFESSIONAL: 'MBTI',
};

export const BIG_FIVE_DIMENSIONS = [
  'OPENNESS',
  'CONSCIENTIOUSNESS',
  'EXTRAVERSION',
  'AGREEABLENESS',
  'NEUROTICISM',
] as const;

export type BigFiveDimension = (typeof BIG_FIVE_DIMENSIONS)[number];

export const MBTI_DIMENSION_PAIRS = [
  { key: 'E_I', poles: ['E', 'I'] as const, labels: ['Extraversion', 'Introversion'] },
  { key: 'S_N', poles: ['S', 'N'] as const, labels: ['Sensing', 'Intuition'] },
  { key: 'T_F', poles: ['T', 'F'] as const, labels: ['Thinking', 'Feeling'] },
  { key: 'J_P', poles: ['J', 'P'] as const, labels: ['Judging', 'Perceiving'] },
] as const;

export type MbtiDimensionKey = (typeof MBTI_DIMENSION_PAIRS)[number]['key'];

// Minimum number of primary (non-follow-up) questions before an assessment can complete.
export const MIN_QUESTIONS_BY_FRAMEWORK: Record<AssessmentFramework, number> = {
  BIG_FIVE: 15,
  MBTI: 16, // 4 per dichotomy
};

export const MAX_FOLLOW_UPS_PER_QUESTION = 1;

export function frameworkForEducation(level: EducationLevel): AssessmentFramework {
  return FRAMEWORK_BY_EDUCATION[level];
}

export function isMinorEducationLevel(level: EducationLevel): boolean {
  return level === 'CLASS_10';
}
