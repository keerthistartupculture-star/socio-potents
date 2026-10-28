# Pathways & practical skill checks — pilot (Phase 4)

Pilot: **Digital Marketing, entry level** (e.g. Marketing / Social Media Executive). Status:
**software ready for a closed pilot; content is a DRAFT** that a domain trainer and employers must
review and change before learners rely on it. Items marked **DECISION** need an owner.

## 1. How it works

1. **Learner chooses** a pathway at `/pathways` (also linked from the dashboard). Nothing is
   assigned from the assessment — report suggestions remain ideas to explore.
2. **First check** (variant A): 4 practical tasks + 6 knowledge questions covering 5 skills.
3. **Knowledge questions** are marked by code against the answer key (never sent to the browser).
4. **Practical answers** go to the trainer queue (Admin → Skill-check marking). An AI may prepare a
   *draft* in the background — a suggested level per criterion with a quote that is verified to
   exist in the answer. The draft is **never shown to the learner** and is **not pre-filled**; the
   trainer chooses each level, adds feedback (required) and optional evidence (must be a real
   quote from the answer), then confirms.
5. **Results** (only from trainer-confirmed marks): a level per skill — Emerging / Developing /
   Secure / Strong — with the descriptor, the evidence and feedback behind it, knowledge questions
   as "x of y correct" (kept separate), strengths, gaps, and for each gap a learning step and a
   small project.
6. **Reassessment** (variant B): new tasks of the same kind, skills, criteria and difficulty,
   available once the first check is fully marked. Progress shows each skill's level before → after.

The learner always sees: draft-content notice (until reviewed) and *"results are not a
job-readiness score; doing well here does not mean an employer will hire you."*

## 2. Content to review (src/config/pathways/digitalMarketingEntry.ts)

| What | Count | Reviewer |
|---|---|---|
| Skills + 4 level descriptors each | 5 | Trainer + 2-3 employers |
| Practical tasks (A and B forms) | 4 × 2 | Trainer + employers (realistic? fair? doable in ~15 min?) |
| Marking criteria with 4 level descriptors | 14 | Trainer |
| Knowledge questions + answer keys | 6 × 2 | Trainer |
| Learning steps / small projects per skill | 10 | Trainer (add specific free resources, with permission to link) |

After edits, run `npx tsx prisma/seed.ts` (idempotent) to load them. When signed off, set the
pathway's `contentStatus` to `TRAINER_REVIEWED` with `reviewedBy`/`reviewedAt` (removes the draft
notice). **DECISION:** who signs off, and which employers are consulted.

## 3. Marking rules (in code — `src/lib/skillProfile.ts`)

- Skill level per check = average of the trainer's criterion levels for that skill, **rounded
  down** (a level must be shown consistently; one strong task can't hide a weak one).
- Strength = Secure/Strong; gap = Emerging/Developing.
- Knowledge results are reported separately and never change the practical level.
- **DECISION (trainers):** keep "round down", or use another rule (e.g. lowest criterion, or
  minimum evidence count per skill before a level is shown).

## 4. Moderation and fairness

- Roles: new **TRAINER** admin role sees only Skill-check marking; ADMIN/SUPER_ADMIN can mark too.
- **DECISION:** double-marking a sample (e.g. 1 in 5 answers marked by a second trainer) to check
  agreement before the pilot widens; target ≥ 80% exact or adjacent agreement per criterion.
- Check AI drafts against trainer marks during the pilot; if they disagree often, switch drafts
  off (they are optional — marking works without them).
- **DECISION:** expected marking turnaround (e.g. within 3 working days) and what learners are told.

## 5. Pilot plan

1. Trainer + employers review and edit content (Section 2).
2. Closed pilot: 15-25 intended learners (final-year students / fresh graduates), full loop:
   first check → feedback → 2-4 weeks of learning steps → reassessment.
3. Measure: completion rate, marking time per answer, trainer agreement, AI-draft agreement,
   learner feedback (clarity of tasks and feedback), and whether equivalent A/B forms behave
   similarly (if B is consistently easier/harder, adjust).
4. Only then consider other domains (Sales, Operations, HR, Accounting) — new content files
   follow the same structure; no code changes needed.

## 6. Known limits

- AI drafts run in-process after submission (fine on a single long-running server; a serverless
  host would need a queue).
- No employer-facing view or certificate — deliberately; achievement ≠ employer eligibility.
- Learner answers are stored indefinitely (see `docs/data-privacy-and-minors.md`).
