# Data, privacy and minor users: current state and decisions needed

Status: **internal draft, not a published privacy notice.** Every item marked **DECISION**
needs an owner (product, legal or counselling lead) before user-facing text is written. The
facts below reflect the code as of October 2026.

## 1. What is collected

- **Account:** name, email, password (stored as a hash), and optionally phone, age, gender,
  location, institution, class/year, career goal and preferred language.
- **Class 10 guardian:** guardian name, email and relationship, and a consent tick-box.
- **Assessment:** the full text of every question and answer, the AI's reading of each answer, the
  personality scores, the career suggestions and the generated report (both the report data and a
  cached PDF).
- **Mentor chat:** the full message history.
- **Usage events:** for example "report viewed". Name, email, phone, guardian details and location
  are removed before an event is stored.
- **Counsellor notes:** free text written by staff about a user.

## 2. Who receives it

- **Google Gemini (AI provider):** during the assessment it receives the user's name, recent
  answers and education level. It also receives career goal and interests (for suggestions), the
  first name (for the report), and the full name, a report summary and messages (for the mentor).
  **DECISION:** stop sending names to the AI? Confirm the provider's data-retention and
  training terms.
- **Mixpanel:** receives usage events. As of this change, only for users who ticked the analytics
  consent.
- **Email provider (Resend):** receives the user's email for reminder emails.

## 3. Who can see it inside the organisation

| Role | Can see |
|---|---|
| Counselor | User list and full user detail, including every answer, AI reasoning and reports; can add notes; can send reminders |
| Admin | Everything a Counselor can, plus CSV export (names and emails), report regeneration, and careers/questions content |
| Super admin | Everything an Admin can, plus deleting reports and changing system settings |

**DECISION:** should Counselors see raw answers and AI reasoning, or only reports? Should viewing
be logged?

## 4. Sharing reports

- Only the signed-in owner can open a report or PDF; there is no public link. The report page's
  button now says "Copy link — only you can open it".
- **Guardians have no way to view a Class 10 report** except through the student's account.
  **DECISION:** add guardian access (an emailed link or a separate login)?

## 5. Retention and deletion (gaps)

- There is **no** user self-service deletion or data download.
- There is **no** admin "delete user" action. A `deletedAt` field exists but nothing sets it.
- There is **no** automatic retention period. Answers, chats and PDFs are kept indefinitely.
- Deleting a report removes its database row but **not** its PDF file.
- **DECISIONS:**
  - What is the retention period (for example, delete inactive accounts after N months)?
  - Add "Delete my account and data" and "Download my data" for users?
  - How should deletion requests from guardians be handled?

## 6. Minor users (Class 10)

**Enforced today:**
- Guardian name, email and relationship are required, and the guardian's email must differ from
  the student's.
- A guardian-consent tick-box is required at signup.

**Not done:**
- The guardian is never contacted, so the consent is **not verified**: the student could tick the
  box themselves.
- Reminder emails go to the student only.
- The AI mentor is available to minors with the same data flow (only its tone is adapted).
- Age is never checked against education level.

**DECISIONS:**
- Verify guardian consent by email before the assessment starts?
- Send reminders and reports to the guardian?
- Restrict or switch off the mentor for under-18s?
- Set a minimum age?
- Define a safeguarding escalation path if a minor discloses risk in the chat or mentor.

## 7. Next engineering steps once decisions are made

- Guardian email verification.
- Self-service data download and deletion.
- A retention cleanup job, including PDF files.
- Logging of admin access to user data.
- A published privacy notice in English and Tamil.
