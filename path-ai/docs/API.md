# API Reference

All endpoints live under `/api`. User-facing endpoints use the NextAuth session cookie;
admin endpoints use a separate signed cookie set by `/api/admin/auth/login`. Every mutating
endpoint validates its body with Zod (`src/lib/validation.ts`) and returns `{ error: string }`
with a 4xx/5xx status on failure — never a raw stack trace.

## Auth

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Create a user account. Enforces guardian consent for Class 10. |
| * | `/api/auth/[...nextauth]` | NextAuth session endpoints (credentials + optional Google OAuth). |

## Assessment (requires user session; caller must own the assessment)

| Method | Path | Description |
|---|---|---|
| POST | `/api/assessment/start` | Starts an assessment; framework is auto-selected from the user's education level. Body: `{ isDemo?: boolean }`. |
| GET | `/api/assessment/:id/question` | Returns the next adaptive question, or `{ done: true }` once enough primary questions have been asked. |
| POST | `/api/assessment/:id/respond` | Submits an answer. Body: `{ questionId, questionText, responseText, inputMethod: 'TEXT', durationMs? }`. May return a `followUp` question. |
| POST | `/api/assessment/:id/pause` | Pauses the assessment. |
| POST | `/api/assessment/:id/resume` | Resumes a paused assessment. |
| POST | `/api/assessment/:id/complete` | Finalizes the assessment: computes personality score, career recommendations, and generates the report (JSON + PDF). |

## Reports (requires user session; caller must own the report)

| Method | Path | Description |
|---|---|---|
| GET | `/api/report/:id` | Returns the structured report JSON. Marks `viewedAt` on first view. |
| GET | `/api/report/:id/pdf` | Streams the generated PDF. Marks `downloadedAt`. |

## Analytics

| Method | Path | Description |
|---|---|---|
| POST | `/api/analytics/track` | Thin client-side proxy for a small allow-list of events (`career_clicked`, `assessment_restarted`). Everything else is tracked server-side directly via `analyticsService.trackEvent`. |

## Admin (requires admin session; role-gated per route)

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/api/admin/auth/login` / `logout` | — | Admin session management. |
| GET | `/api/admin/stats` | ADMIN, SUPER_ADMIN | Dashboard cards + chart data. Query: `?range=today\|7d\|30d\|90d`. |
| GET | `/api/admin/users` | ADMIN, SUPER_ADMIN, COUNSELOR | Paginated, searchable/filterable user list. |
| GET | `/api/admin/users/:id` | ADMIN, SUPER_ADMIN, COUNSELOR | Full user detail: profile, assessments, transcripts, scores, recommendations, counselor notes. |
| POST | `/api/admin/users/:id/notes` | ADMIN, SUPER_ADMIN, COUNSELOR | Add a counselor note. |
| GET | `/api/admin/assessments` | ADMIN, SUPER_ADMIN, COUNSELOR | Paginated assessment list with filters `?status=&framework=`. |
| GET/POST | `/api/admin/questions` | ADMIN, SUPER_ADMIN | List / create question bank entries. |
| PATCH/DELETE | `/api/admin/questions/:id` | ADMIN, SUPER_ADMIN | Update or deactivate (soft-delete) a question. |
| GET/POST | `/api/admin/careers` | ADMIN, SUPER_ADMIN | List / create careers. |
| PATCH/DELETE | `/api/admin/careers/:id` | ADMIN, SUPER_ADMIN | Update or deactivate a career. |
| GET | `/api/admin/reports` | ADMIN, SUPER_ADMIN, COUNSELOR | Paginated report list. |
| GET/POST/DELETE | `/api/admin/reports/:id` | varies | View / regenerate (ADMIN+) / delete (SUPER_ADMIN only). |
| GET/PATCH | `/api/admin/settings` | ADMIN read, SUPER_ADMIN write | Branding, demo mode, retake policy — key/value store. |
| GET | `/api/admin/export?type=users\|assessments\|career-recommendations` | ADMIN, SUPER_ADMIN | CSV export, capped at 5,000 rows. |

## AI response contract

Every Gemini call goes through `generateStructuredJson()` in `src/services/geminiService.ts`,
which requires a Zod schema, retries once on invalid JSON, and throws a typed `AiServiceError`
if both attempts fail — callers always catch this and fall back to a neutral/demo value rather
than surfacing a raw AI failure to the user. See `src/config/prompts/taskPrompts.ts` for the
exact JSON shape each task prompt requests.
