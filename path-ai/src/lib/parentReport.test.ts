import { describe, expect, it } from 'vitest';
import { exploreStepsFor, fitLabel, plainStrengths, plainText, studyApproaches, studyStartingPoint, suggestionLimitsFor } from './parentReport';

describe('plainText', () => {
  it('removes personality-test vocabulary', () => {
    const out = plainText('As an ENTJ, Riya shows high Extraversion and low Neuroticism (MBTI).');
    expect(out).not.toMatch(/ENTJ|MBTI|Extraversion|Neuroticism/i);
  });

  it('drops "like MBTI" instead of producing "like this assessment"', () => {
    expect(plainText("I don't use personality labels like MBTI, as our assessment focuses on tendencies.")).toBe(
      "I don't use personality labels, as our assessment focuses on tendencies."
    );
  });

  it('leaves ordinary text untouched', () => {
    expect(plainText('Riya enjoys science projects.')).toBe('Riya enjoys science projects.');
  });
});

describe('plain profile helpers', () => {
  const profile = {
    framework: 'MBTI' as const,
    mbti: { scores: { E_I: { score: 30 }, S_N: { score: 80 }, T_F: { score: 40 }, J_P: { score: 20 } } },
  };

  it('describes strengths without type letters', () => {
    const labels = plainStrengths(profile).map((s) => s.label);
    expect(labels).toContain('Confidence with People');
    expect(labels).toContain('Big-Picture Imagination');
    expect(labels.join(' ')).not.toMatch(/\b[EI][SN][TF][JP]\b/);
  });

  it('orders study ideas without percentages or a learner-type label', () => {
    const approaches = studyApproaches(profile);
    expect(approaches).toHaveLength(4);
    expect(approaches.every((a) => !('percent' in a))).toBe(true);
    const headline = studyStartingPoint(approaches);
    expect(headline).toContain(approaches[0].label.toLowerCase());
    expect(headline).not.toMatch(/learner|learns best/i);
  });

  it('describes strength levels as how clearly they came through, not as ability', () => {
    expect(plainStrengths(profile).map((s) => s.level).join(' ')).not.toMatch(/Strong|Developing|Growing/);
  });
});

describe('fitLabel', () => {
  it('uses overlap wording, never outcome or percentage wording', () => {
    for (const score of [95, 70, 55, 20]) {
      expect(fitLabel(score)).not.toMatch(/%|excellent|great|success/i);
    }
  });
});

describe('career caveats match who the report is for', () => {
  it('does not talk about school, marks or subjects to a working professional', () => {
    const text = [...suggestionLimitsFor('PROFESSIONAL'), ...exploreStepsFor('PROFESSIONAL')].join(' ');
    expect(text).not.toMatch(/school|college|marks|subject/i);
  });

  it('keeps the student wording for students and parents', () => {
    expect(suggestionLimitsFor('STUDENT').join(' ')).toMatch(/school and college/);
    expect(exploreStepsFor('PARENT').join(' ')).toMatch(/subjects, courses or exams/);
  });
});
