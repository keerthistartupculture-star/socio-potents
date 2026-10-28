# Assessment method: questions, scoring and interpretation

Status: **draft for specialist review.** This document describes what the code does today
(October 2026). It is not evidence that the method is valid. Section 6 lists what a qualified
assessment specialist needs to review or test before the results are relied on.

## 1. Who takes which assessment

| Education level | Framework | Minimum answers |
|---|---|---|
| Class 10 | Big Five (5 traits) | 15 |
| Class 12, Diploma, UG, PG, Working professional | MBTI-style (4 pairs) | 16 |

Source: `src/config/frameworks.ts`.

## 2. Questions

- The assessment is a **free-form chat**, not a fixed questionnaire. Gemini writes each question.
  It is steered towards the trait that has the fewest answers so far.
- The seed bank holds 30 Big Five scenarios (6 per trait) and 40 MBTI scenarios (10 per pair).
  Seed file: `prisma/seed.ts`. These scenarios are only given to the AI as **style examples**.
  They are shown word-for-word only when the AI is unavailable.
- Consequence: two people never answer the same questions. That limits comparability between
  people and over time (see Section 6).
- Completion is decided by code, never by the AI (`isReadyToSubmit` in
  `src/services/assessmentService.ts`). The attempt is ready when the minimum is reached and every
  trait has at least one reading, or at twice the minimum regardless.

## 3. Scoring

1. **Per answer.** Gemini reads the answer and returns:
   - a signal for the trait being explored: 0..1 for Big Five, or -1..1 for MBTI, where -1 is the
     first pole of the pair (E, S, T, J);
   - a confidence from 0 to 1.

   Code keeps only valid traits and clamps out-of-range values (`sanitizeSignals`). If the AI call
   fails, the answer is stored **with no signal and zero confidence**, so it cannot affect scores.
2. **Per trait** (`src/services/personalityService.ts`):
   - The score is the average of the signals, weighted by `max(confidence, 0.1)` and scaled to
     0–100.
   - Trait confidence = average confidence × min(1, readings ÷ 3).
   - A trait with no readings scores 50 with confidence 0.
3. **MBTI letters.** A pair scoring 50 or more takes the second letter (I/N/F/P); otherwise it takes
   the first.
4. `confidenceOverall` is the mean of the trait confidences. It reflects the **AI's own certainty**,
   not measured reliability, so it is **not shown to users**.

Demo-mode attempts (`isDemo`) use simulated random signals. They are for demonstrations only.

## 4. Career suggestions

- The database holds 52 careers in 8 categories. Each career has a **hand-written** ideal profile:
  a target value per Big Five trait plus weights for 2–4 MBTI types. **No source is cited** for
  these profiles.
- The match is calculated by code only (`structuralAlignmentScore` in
  `src/services/careerRecommendationService.ts`):
  - Big Five: average of `1 − |user score − career target|`.
  - MBTI: the weight for the user's type if the career lists it; otherwise the share of matching
    letters × the weight.
- The top 8 careers by this number are suggested, in that order. The AI may only write the "why"
  text for careers the code has already chosen. It cannot add, remove, reorder or score careers.
- Each suggestion's reason names the tendencies from the answers that the career draws on
  (`alignedTraits`).
- Users see words, never the number:

  | Number | Label shown |
  |---|---|
  | 80 or more | Closer match |
  | 65 or more | Good overlap |
  | 50 or more | Some overlap |
  | Below 50 | Worth exploring |

- The number measures how similar two profiles are. It is **not** a probability of success,
  employment, admission or earnings, and the report says so.

## 5. How results are described to users

- **Strengths.** The heading is "What came through in X's answers". The levels shown are "Clear in
  answers", "Some signs" and "Fewer signs". The report states that these are self-described
  tendencies, not tested skills.
- **Study ideas.** These are an ordered list of study methods to try, with no percentages and no
  "type of learner" label. The report adds a note that fixed learning styles are not supported by
  evidence.
- **Audience.** Class 10 reports are written for parents. Class 12 to postgraduate reports are
  written for the student. Working professionals get work-focused wording.
- **AI text.** The prompts forbid personality-test jargon, percentages, promises of success and
  comparisons with famous people (`SAFEGUARD_CLAUSE`). A text filter (`plainText`) removes any
  type codes that slip through.

## 6. Open issues for specialist review (not resolved by code)

- **Validity of AI-extracted signals.** There is no scoring rubric telling the AI what a 0.2 or a
  0.8 means. Agreement between the AI and trained human raters has not been tested.
- **Reliability.** Questions differ for every person. Test–retest consistency and internal
  consistency have not been measured.
- **MBTI-style dichotomies** are contested in the research literature. Should college and
  professional users get a Big Five-based measure instead?
- **Career profiles** are hand-written and unsourced. They need to be checked against a recognised
  occupational source (for example O*NET-style interest/work-style data, adapted for India).
- **Scores barely separate careers.** In a demo run, all 8 suggestions scored between 86 and 89:
  averaging closeness across 5 traits compresses the range. The ranking between them is therefore
  weak, so the formula needs review.
- **Fairness.** Results have not yet been compared across gender, region, school type, language
  (Tamil/English) or answer length. Short or non-native-English answers may be read differently by
  the AI.
- **Tamil.** No Tamil interface exists yet, and the PDF font cannot render Tamil script.
  Comprehension testing needs Tamil-speaking reviewers.
- **Unused code.** `buildPersonalityScoringPrompt` in `src/config/prompts/taskPrompts.ts` is not
  used. Its MBTI wording contradicts the code's convention, so it should be removed or fixed.
- **Model version.** The `aiModelVersion` default in the schema (`gemini-3.6-flash`) does not match
  the model actually used by default (`gemini-3.1-flash-lite`).
