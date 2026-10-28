/**
 * Mentor evaluation runner (Phase 3). Sends every case in eval/mentor-cases.json through the same
 * prompt, reference grounding and guardrails the live mentor uses, applies the automatic checks,
 * and writes a results file with blank columns for human reviewers to score.
 *
 *   npm run eval:mentor                      # uses GEMINI_MODEL from .env
 *   GEMINI_MODEL=<other-model> npm run eval:mentor
 *   npm run eval:mentor -- --only=tamil-01,tamil-02   # re-run selected cases
 *   npm run eval:mentor -- --dry              # no AI calls: checks classification + reference only
 *
 * This spends one AI call per non-crisis case (16 cases ≈ 13 calls). To compare a provider other
 * than Gemini, add an adapter with the same signature as generateMentorReply and select it here.
 */
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '@/lib/prisma';
import { generateMentorReply, isGeminiConfigured } from '@/services/geminiService';
import { buildMentorSystemPrompt } from '@/config/prompts/taskPrompts';
import { careerReference } from '@/services/mentorService';
import { classifyMessage, guardReply } from '@/lib/mentorSafety';
import { plainText } from '@/lib/parentReport';

interface Profile {
  isMinor: boolean;
  name: string;
  report: string;
  careers: string[];
}
interface Case {
  id: string;
  profile: string;
  message: string;
  auto: { kind?: 'CRISIS' | 'HUMAN_REQUESTED'; mustMatch?: string[]; mustNotMatch?: string[] };
  rate: string[];
}

/** Retries temporary provider errors (e.g. 503 "high demand", 429) with back-off: 5s, 15s, 45s. */
async function withRetry(fn: () => Promise<string>): Promise<string | Error> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      const cause = String((err as { cause?: unknown }).cause ?? err);
      const temporary = /(503|429|500)|high demand|overloaded|timeout|aborted/i.test(cause);
      if (!temporary || attempt >= 3) return err as Error;
      await new Promise((r) => setTimeout(r, 5000 * 3 ** attempt));
    }
  }
}

async function main() {
  const dry = process.argv.includes('--dry');
  if (!dry && !isGeminiConfigured()) throw new Error('GEMINI_API_KEY is not set.');
  const file = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'eval', 'mentor-cases.json'), 'utf8')) as {
    profiles: Record<string, Profile>;
    cases: Case[];
  };
  const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  const rows: string[] = [];
  let autoPass = 0;
  let errors = 0;

  // --only id1,id2 re-runs just those cases (e.g. ones that hit provider errors).
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const only = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
  const cases = only ? file.cases.filter((c) => only.has(c.id)) : file.cases;

  for (const c of cases) {
    const p = file.profiles[c.profile];
    const kind = classifyMessage(c.message);
    const failures: string[] = [];
    if (c.auto.kind && kind !== c.auto.kind) failures.push(`expected ${c.auto.kind}, classified ${kind}`);

    let reply = '(crisis — fixed reply, not sent to the model)';
    let removed: string[] = [];
    if (kind !== 'CRISIS') {
      const ids = (await prisma.career.findMany({ where: { title: { in: p.careers } }, select: { id: true } })).map((r) => r.id);
      const reference = await careerReference(ids, c.message);
      if (dry) {
        rows.push(`### ${c.id}
classified ${kind}; reference:
${reference.slice(0, 300)}
`);
        process.stdout.write(`${c.id}: ${failures.length ? 'FAIL' : 'ok'} (dry, ${kind})
`);
        if (failures.length === 0) autoPass += 1;
        continue;
      }
      const systemPrompt = buildMentorSystemPrompt({ userName: p.name, reportContext: `${p.report}\n\n${reference}`, isMinor: p.isMinor });
      const rawOrError = await withRetry(() => generateMentorReply({ systemPrompt, history: [], message: c.message, timeoutMs: 30_000 }));
      if (rawOrError instanceof Error) {
        // Provider outage after retries: record it and move on rather than losing the whole run.
        const cause = String((rawOrError as { cause?: unknown }).cause ?? rawOrError).slice(0, 200);
        rows.push(`### ${c.id} (${c.profile})\n**Student:** ${c.message}\n**ERROR (not scored):** ${cause}\n`);
        process.stdout.write(`${c.id}: ERROR\n`);
        errors += 1;
        continue;
      }
      const raw = plainText(rawOrError);
      // Checks run on the RAW model output (what the model would have said), then the guard
      // result is reported separately — a model that needs the guard often is a worse model.
      for (const re of c.auto.mustNotMatch ?? []) if (new RegExp(re, 'i').test(raw)) failures.push(`matched forbidden /${re}/`);
      for (const re of c.auto.mustMatch ?? []) if (!new RegExp(re, 'i').test(raw)) failures.push(`missing /${re}/`);
      const guarded = guardReply(raw);
      removed = guarded.violations;
      reply = raw;
    }
    if (failures.length === 0) autoPass += 1;
    rows.push(
      [
        `### ${c.id} (${c.profile})`,
        `**Student:** ${c.message}`,
        `**Mentor (raw):** ${reply.replace(/\n/g, ' / ')}`,
        `**Auto checks:** ${failures.length ? `FAIL — ${failures.join('; ')}` : 'pass'}${removed.length ? ` · guard would remove: ${removed.join(', ')}` : ''}`,
        c.rate.length ? `**Rate (1-5 each):** ${c.rate.map((r) => `${r}: __`).join(' · ')}` : '',
        '',
      ]
        .filter(Boolean)
        .join('\n')
    );
    process.stdout.write(`${c.id}: ${failures.length ? 'FAIL' : 'pass'}\n`);
  }

  const outDir = path.join(process.cwd(), 'eval', 'results');
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `${model}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.md`);
  fs.writeFileSync(
    out,
    `# Mentor eval — ${model}\n\nAuto checks passed: ${autoPass}/${cases.length - errors} scored cases (${errors} provider errors, not scored)\n\nRating guide: docs/mentor-scope.md §5.\n\n${rows.join('\n')}`
  );
  console.log(`\n${autoPass}/${cases.length - errors} scored cases passed automatic checks; ${errors} provider errors. Results: ${out}`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
