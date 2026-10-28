# CareerCompass AI

AI-powered career assessment platform for students and working professionals. Assesses
personality through a chat interview, picks the right framework (Big Five or MBTI)
based on education level, and generates a personalized career report.

> "CareerCompass AI" is a placeholder name — change it any time from **/admin/settings →
> Branding** without touching code.

## Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API routes (Node/TypeScript)
- **Database**: PostgreSQL via Prisma ORM
- **AI**: Google Gemini (server-only service layer, swappable provider)
- **Analytics**: Mixpanel (server-proxied) + persisted `analytics_events` table
- **Charts**: Recharts
- **Auth**: NextAuth (users) + a separate signed-cookie JWT session (admin/counselor)
- **PDF**: `@react-pdf/renderer`, generated server-side
- **Tests**: Vitest

## Project layout

```
prisma/
  schema.prisma       # all tables (see spec §20)
  seed.ts             # 30 Big Five Qs, 40 MBTI Qs, 50 careers, admin account
src/
  app/                # pages + API routes (App Router)
    api/               # REST endpoints, grouped by domain
    admin/(protected)/ # admin console, guarded by src/app/admin/(protected)/layout.tsx
  components/          # UI components (ui primitives, assessment, report, admin)
  config/
    frameworks.ts       # education level -> framework mapping, dimension lists
    prompts/             # all Gemini prompts, kept as data (spec §28)
  services/             # business logic layer (spec §5)
    geminiService.ts           # ONLY module that talks to Gemini
    assessmentService.ts       # conversation engine / adaptive questions
    personalityService.ts      # deterministic Big Five / MBTI scoring
    careerRecommendationService.ts
    reportService.ts
    pdfService.ts
    analyticsService.ts        # ONLY module that talks to Mixpanel
  lib/                  # auth, prisma client, validation, rate limiting, logging
```

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment** — copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` — a PostgreSQL connection string
   - `GEMINI_API_KEY` — from Google AI Studio (leave blank to run entirely in fallback/demo mode)
   - `MIXPANEL_TOKEN` — optional, analytics still persist to the DB without it
   - `NEXTAUTH_SECRET`, `ADMIN_JWT_SECRET` — generate with `openssl rand -base64 32`

3. **Set up the database**

   ```bash
   npm run prisma:migrate   # creates tables
   npm run prisma:seed      # seeds questions, careers, and a SUPER_ADMIN account
   ```

   The seed script prints a one-time admin password to the console — log in at
   `/admin/login` and change it immediately (via a database update, since there is no
   self-service admin password change screen yet).

4. **Run the app**

   ```bash
   npm run dev
   ```

   - Public site: http://localhost:3000
   - Admin console: http://localhost:3000/admin/login

## Testing

```bash
npm test          # unit tests: Big Five/MBTI scoring, career matching, validation, an
                   # end-to-end assessment-flow simulation (no DB/network required)
npm run typecheck  # TypeScript project-wide check
```

## How the two frameworks are selected

`src/config/frameworks.ts` maps education level → framework:

| Education level | Framework |
|---|---|
| Class 10 | Big Five |
| Class 12 | MBTI |
| Diploma / Undergraduate / Postgraduate | MBTI |
| Working Professional | MBTI |

This mapping drives question selection, scoring, prompts, and report generation — it is the
single source of truth referenced everywhere else.

## Scoring: hybrid, not "AI vibes"

Gemini only ever extracts a `dimension_signals` + `confidence` reading from a single free-text
response (see `src/config/prompts/taskPrompts.ts` → `buildResponseAnalysisPrompt`). Combining
those signals into a final Big Five/MBTI score is 100% deterministic code in
`src/services/personalityService.ts` — Gemini never declares a final personality result on its
own, and a malformed/failed AI call falls back to a neutral signal rather than crashing the
assessment.

Career matching follows the same hybrid pattern: `careerRecommendationService.ts` computes a
deterministic structural alignment score against every active career first, and only asks
Gemini to explain/rank the already-narrowed shortlist.

## Demo Mode

Toggle **Demo Mode** from `/admin/settings`. When a user starts a demo assessment, every AI
call is replaced by fast simulated signals so the product can be shown without spending Gemini
credits. Demo assessments are flagged `isDemo: true` in the database.

## Security notes

- `GEMINI_API_KEY` and `MIXPANEL_TOKEN` are read only in `src/services/*` files marked
  `import 'server-only'` — never sent to the browser.
- Admin auth uses a separate signed JWT cookie (`ADMIN_JWT_SECRET`) from user auth
  (`NEXTAUTH_SECRET`), so a compromised user session can never escalate to admin.
- All mutating API routes validate input with Zod (`src/lib/validation.ts`) and are
  rate-limited (`src/lib/rateLimit.ts`).
- Passwords are hashed with bcrypt (cost factor 12).

## Deployment

Works on any Node hosting target (Vercel, Render, AWS, a Hostinger VPS) — the frontend and
backend are not split into separate deployables today (both live in the one Next.js app), but
every AI/DB/analytics call is isolated in `src/services/*`, so a split into a standalone API
service later mostly means moving that directory.

```bash
npm run build   # runs `prisma generate` then `next build`
npm start
```

Run `npm run prisma:deploy` against production `DATABASE_URL` before first boot.

## Known gaps / next steps

This is a working end-to-end implementation of every phase in the spec (auth, DB, adaptive
chat assessment, hybrid scoring, career matching, PDF reports, admin dashboard with
charts, Mixpanel, tests) but a few things are intentionally left for a follow-up pass rather
than stubbed silently:

- Google OAuth sign-in is wired up but only activates if `GOOGLE_CLIENT_ID`/`SECRET` are set.
- Admin password reset/self-service is DB-only today (no "forgot password" email flow yet).
- CSV export is capped at 5,000 rows per request; a very large institution would want a
  background export job instead.
