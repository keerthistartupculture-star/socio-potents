# Deploying Socio Potents + Path AI

The site serves two things from one domain:

| URL | What | Where in this folder |
|---|---|---|
| `sociopotents.in/` | Socio Potents website (static HTML) | root of this folder, served by `server.js` |
| `sociopotents.in/path-ai` | Path AI career assessment (Next.js app) | `path-ai/` |

`server.js` (port 3000) serves the website and forwards every `/path-ai/...` request to the
Path AI server (port 4000). Only port 3000 needs to be public.

## On Render (one web service)

`render.yaml` sets everything up as ONE Render web service: `start.js` runs Path AI on an
internal port and `server.js` on Render's port. No `.env` file is used on Render — settings are
the service's environment variables.

1. Push this folder to its GitHub repo (`Socio-Potents`).
2. Render dashboard → **New → Blueprint** → pick the `Socio-Potents` repo. Render reads `render.yaml`.
3. Fill in the values it asks for:

   | Setting | Value |
   |---|---|
   | `DATABASE_URL` | To keep existing Path AI accounts and reports: open the existing Path AI database in Render → **Connect** → copy the **Internal Database URL**. Otherwise create a new Render PostgreSQL and use its Internal URL. |
   | `GEMINI_API_KEY` | The Gemini key (free tier works; see "The AI" below) |
   | `NEXTAUTH_URL` | `https://<service>.onrender.com/path-ai/api/auth` for now; `https://sociopotents.in/path-ai/api/auth` once the domain is connected |
   | `APP_URL` | Same address without `/api/auth` |
   | `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Path AI admin login (`/path-ai/admin`) |

4. Deploy. The log should end with `Path AI: /path-ai -> http://127.0.0.1:4000` and `Ready`.
5. Open `https://<service>.onrender.com`, click **Path AI**, register, finish one assessment and
   download the PDF.
6. Connect the domain: service → **Settings → Custom Domains** → add `sociopotents.in` (and
   `www.sociopotents.in`), add the DNS records Render shows at your domain registrar, then change
   `NEXTAUTH_URL` and `APP_URL` to the `sociopotents.in` addresses.
7. Only then delete the old Path AI **web service**. Keep the old **database** if `DATABASE_URL`
   points at it.

Free plan notes: the service sleeps after ~15 minutes without visitors (the next visit takes about
a minute), and a free Render database expires 30 days after it was created — check its expiry
date in the dashboard and upgrade it before then to keep the data.

## On your own server

### What the server needs

- Node.js 20+
- PostgreSQL 14+ (for Path AI)
- A Google Gemini API key (for Path AI's chat and reports)
- HTTPS for `sociopotents.in`, pointing at port 3000

## Option A — Docker

1. Copy `path-ai/.env.example` to `path-ai/.env` and fill it in (see the table below).
   `DATABASE_URL` can be left as is; docker-compose sets it.
2. Create a `.env` file next to `docker-compose.yml` with one line:
   `PATH_AI_DB_PASSWORD=<a long random password>`
3. Run `docker compose up -d --build`.
4. Check the AI works:
   `docker compose exec path-ai npx tsx --conditions=react-server scripts/check-ai.ts`
   It must end with `OK: the assessment AI is working.`
5. Point HTTPS for `sociopotents.in` at port 3000.

## Option B — without Docker

```bash
# 1. Path AI (port 4000)
cd path-ai
cp .env.example .env          # then fill it in, including DATABASE_URL
npm ci
npm run check:ai              # must end with "OK: the assessment AI is working."
npx prisma generate
npx next build
npx prisma migrate deploy && npx tsx prisma/seed.ts
npx next start -p 4000        # keep running (pm2/systemd)

# 2. Website (port 3000)
cd ..
npm ci
PATH_AI_URL=http://127.0.0.1:4000 npm start                # keep running (pm2/systemd)
```

`path-ai/.env` must keep the line `NEXT_PUBLIC_BASE_PATH="/path-ai"`. Path AI reads it when it
is built and again when it starts; without it every `/path-ai` page returns 404.

## Path AI settings (`path-ai/.env`)

| Setting | Value |
|---|---|
| `NEXT_PUBLIC_BASE_PATH` | `/path-ai` — already set in `.env.example`, do not remove |
| `DATABASE_URL` | PostgreSQL connection string (Docker sets this for you) |
| `GEMINI_API_KEY` | Google Gemini key — **required**; without it assessments refuse to start |
| `GEMINI_MODEL` | `gemini-3.1-flash-lite` (tested; leave as is unless told otherwise) |
| `NEXTAUTH_URL` | `https://sociopotents.in/path-ai/api/auth` |
| `APP_URL` | `https://sociopotents.in/path-ai` |
| `NEXTAUTH_SECRET` | long random string (`openssl rand -base64 32`) |
| `ADMIN_JWT_SECRET` | a different long random string |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Path AI admin login (`/path-ai/admin`) |

The rest are optional and explained in `path-ai/.env.example`.

## The AI (Gemini)

- Create the key at https://aistudio.google.com/apikey and put it in `GEMINI_API_KEY`.
- The key must come from a Google project that has the Gemini **free tier** (or billing turned
  on). Some new projects have no free tier: `npm run check:ai` then says so.
- On the free tier, each assessment uses about 20 AI calls and there is a daily limit per model.
  At busy times Google overloads the free models ("503 high demand"), so replies can take 10–25
  seconds. The app copes automatically: it switches to a backup model (`GEMINI_FALLBACK_MODEL`,
  which also has its own daily limit) and scores any missed answer again at Submit.
- When Google is very busy, some answers can't be scored at all. The report is only built when
  every trait has at least 2 scored answers and two-thirds of all answers are scored; otherwise
  the student is asked to press Submit again a few minutes later.
- If the AI is unreachable for most of an assessment, Submit does not build a report. The student
  sees "All your answers are saved… please press Submit again in a few minutes", and pressing it
  again later builds the full, properly scored report.
- Run the AI check (above) after any change to the key or model. It explains what is wrong
  if it fails: missing key, rejected key, unknown model, quota used up, or no internet access
  from the server.
- If the key is missing, students see "The assessment isn't available right now" instead of
  getting a fake result, and the server log says `GEMINI_API_KEY is not set`.
- Turning on billing later removes the daily limit and the slow periods. Nothing else changes.

## Checking it works

- `https://sociopotents.in/` — website loads, menu shows **Path AI**
- `https://sociopotents.in/path-ai` — Path AI home page
- Register, take the assessment, submit, open the report and download the PDF
- `https://sociopotents.in/path-ai/admin` — admin login

If `/path-ai` shows "Path AI is starting up or unavailable", the Path AI server on port 4000
is not running or `PATH_AI_URL` is wrong.

## Data to keep backed up

- The PostgreSQL database (all Path AI users, answers and reports)
- `path-ai/storage/reports/` — cached PDFs (optional; they are rebuilt if missing)
