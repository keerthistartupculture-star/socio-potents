// Deterministic skill results for the pathway checks (Phase 4). Pure functions shared by the
// learner page, the trainer page and the API.
//
// Rules (docs/pathway-pilot.md):
// - Only trainer-moderated marks count. AI drafts never reach a learner's results.
// - A skill's level for a round is the average of the criterion levels (1-4) given for that skill
//   across that round's practical tasks, rounded DOWN: a level has to be shown consistently to
//   count, so one strong task can't hide a weak one (2.67 → Developing, not Secure). Trainers may
//   change this rule during the pilot (docs/pathway-pilot.md). Knowledge answers are reported separately,
//   as "x of y correct", and never mixed into the practical level.
// - Results describe skill levels shown on these tasks, with the evidence behind them. They are
//   never a job-readiness percentage, and achievement here does not mean an employer will hire.

export type Level = 1 | 2 | 3 | 4;

export interface CriterionMark {
  level: Level;
  evidence?: string;
  feedback?: string;
}

export interface RubricCriterionLike {
  id: string;
  skillCode: string;
  criterion: string;
}

export interface AttemptLike {
  round: number;
  status: 'SUBMITTED' | 'MODERATED' | 'AUTO_MARKED';
  isCorrect?: boolean | null;
  finalMarks?: Record<string, CriterionMark> | null;
  task: { title: string; kind: 'PRACTICAL' | 'KNOWLEDGE'; skillCodes: string[]; rubric: RubricCriterionLike[] };
}

export interface SkillEvidence {
  taskTitle: string;
  criterion: string;
  level: Level;
  evidence?: string;
  feedback?: string;
}

export interface SkillResult {
  skillCode: string;
  level: Level | null; // null = not yet marked by a trainer
  practicalMarks: number;
  knowledge: { correct: number; total: number };
  evidence: SkillEvidence[];
}

export function skillResults(skillCodes: string[], attempts: AttemptLike[], round: number): SkillResult[] {
  return skillCodes.map((code) => {
    const evidence: SkillEvidence[] = [];
    const knowledge = { correct: 0, total: 0 };
    for (const a of attempts) {
      if (a.round !== round) continue;
      if (a.task.kind === 'KNOWLEDGE' && a.status === 'AUTO_MARKED' && a.task.skillCodes.includes(code)) {
        knowledge.total += 1;
        if (a.isCorrect) knowledge.correct += 1;
      }
      if (a.task.kind === 'PRACTICAL' && a.status === 'MODERATED' && a.finalMarks) {
        for (const c of a.task.rubric) {
          const mark = a.finalMarks[c.id];
          if (c.skillCode === code && mark) {
            evidence.push({ taskTitle: a.task.title, criterion: c.criterion, level: mark.level, evidence: mark.evidence, feedback: mark.feedback });
          }
        }
      }
    }
    const level =
      evidence.length > 0 ? (Math.min(4, Math.max(1, Math.floor(evidence.reduce((s, e) => s + e.level, 0) / evidence.length))) as Level) : null;
    return { skillCode: code, level, practicalMarks: evidence.length, knowledge, evidence };
  });
}

/** Strengths are skills marked Secure or Strong; gaps are Emerging or Developing. */
export function strengthsAndGaps(results: SkillResult[]) {
  return {
    strengths: results.filter((r) => r.level !== null && r.level >= 3),
    gaps: results.filter((r) => r.level !== null && r.level <= 2),
    notYetMarked: results.filter((r) => r.level === null),
  };
}

/** Change in level between the first check and the reassessment, per skill (null if either is unmarked). */
export function progress(first: SkillResult[], second: SkillResult[]) {
  return first.map((f) => {
    const s = second.find((x) => x.skillCode === f.skillCode);
    return {
      skillCode: f.skillCode,
      from: f.level,
      to: s?.level ?? null,
      change: f.level !== null && s?.level != null ? s.level - f.level : null,
    };
  });
}

/** True if the quoted evidence really appears in the learner's response (whitespace/case-insensitive). */
export function evidenceIsQuoted(response: string, quote: string | undefined): boolean {
  if (!quote || !quote.trim()) return false;
  const norm = (t: string) => t.toLowerCase().replace(/[“”"]/g, '"').replace(/[‘’']/g, "'").replace(/\s+/g, ' ').trim();
  return norm(response).includes(norm(quote));
}
