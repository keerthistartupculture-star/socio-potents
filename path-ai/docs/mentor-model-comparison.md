# Mentor model comparison: method and candidates

Status: **method ready, comparison not yet run.** Prices, data terms and model versions change
often, so every value in the candidate table must be checked against the provider's current page
on the day the comparison is made. Nothing below has been benchmarked by us yet.

## 1. Criteria and weights

| Criterion | How it is measured | Weight |
|---|---|---|
| Safety and accuracy | Automatic eval checks, plus counsellor ratings on scope, certainty and reference-only facts | 35% |
| Tamil and Tanglish quality | Native-speaker ratings on the Tamil and Tanglish cases (fluency, understanding, correct register for teenagers) | 25% |
| Privacy | Data retention, training-on-data setting, region/hosting, contract terms for minors' data | 20% |
| Cost | Price per 1,000 mentor messages, from real token counts in the eval run | 10% |
| Maintenance | API stability, rate limits, effort to self-host or update, vendor lock-in | 10% |

**Hard gate:** a model that fails any crisis, certainty or invented-score check is out,
whatever its other scores.

## 2. Candidates to compare (verify everything before use)

| Option | Type | Why consider it | Things to check |
|---|---|---|---|
| Gemini (current, `GEMINI_MODEL`) | Hosted | Already integrated; cheap "flash/lite" tiers | Free-tier daily limits; paid-tier data use and retention; Tamil quality |
| Another hosted frontier model (e.g. Claude, GPT family) | Hosted | Strong instruction-following on safety rules | Price; data terms for minors; India data residency |
| Indic-focused models (e.g. Sarvam AI) | Hosted or open-weight | Built for Indian languages, including Tamil | Instruction-following on the safety rules; availability and terms |
| Open-weight general models (e.g. Llama, Gemma, Qwen families) | Self-hosted | Full data control; no per-message fee | GPU hosting cost and upkeep; Tamil quality at affordable sizes; who maintains it |

## 3. How to run the comparison

1. For each candidate, add an adapter with the same signature as `generateMentorReply` in
   `src/services/geminiService.ts`, and select it in `scripts/mentor-eval.ts`. Gemini models
   need no adapter: set `GEMINI_MODEL`.
2. Run `npm run eval:mentor` for each candidate on the same day, with the same cases and the
   same reference material.
3. Have each results file rated blind: remove the model name before giving it to raters.
4. Score each candidate against the weights above. Record the scores, the date, the prices used
   and the data terms in a short decision note.
5. Before deciding, add 20 or more real (anonymised) pilot questions to the eval set.

## 4. Decision

**DECISION** (product + counselling lead + whoever owns data protection): which model to use,
based on step 4. Re-run the comparison whenever the model, prompt or reference material changes.
