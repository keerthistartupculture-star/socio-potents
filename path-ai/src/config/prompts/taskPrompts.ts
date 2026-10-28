// Task-specific prompt builders (spec §28/§29). Each returns a prompt that instructs Gemini
// to reply with ONLY strict JSON matching a documented shape, validated by
// src/services/geminiService.ts before use.

import { SAFEGUARD_CLAUSE } from './systemPrompts';

/**
 * Opens the conversation — no prior answer exists yet, so there's nothing to analyze. Used
 * exactly once per assessment (the very first message).
 */
// Shared brevity/tone rules for every message the AI sends in the conversation — the single
// biggest quality issue found in testing was messages reading like written paragraphs (a warm
// intro clause, then the scenario, then a trailing "why" clause) instead of how a person
// actually texts. These rules apply to both the opening message and every later turn.
const CHAT_STYLE_RULES = `
Write like you're actually texting someone, not composing a paragraph:
- One short sentence. Two only if the second is truly necessary. Never three or more.
- No warm-up clauses ("Hi there!", "It's so nice to meet you", "I'm really looking forward to...").
  Skip straight to the point.
- No stacked sub-clauses joined with commas/"and"/"or" — say one thing at a time.
- Match the user's own energy and length. If their answers are short and casual, your messages
  must be short and casual too — never longer or more formal than what they're writing to you.
- Plain, everyday words. No flowery or corporate phrasing.`;

// The other half of feeling like a conversation rather than an interrogation: the assistant has
// to put something of its own in, not only extract. A chat where every single message ends in a
// question mark reads as a form being filled out, however casual the wording is.
const TWO_WAY_RULES = `
Give something back, don't only ask:
- Not every message should be a question. Regularly say what you're actually noticing about them
  — a small observation, a playful guess, something you relate to — and let them confirm, correct,
  or run with it. "Sounds like you'd rather learn something useless but fascinating than something
  practical." invites a reply just as well as a question does, and feels far more like a person.
- If you have picked up on a pattern across what they've told you so far, say it out loud. Being
  seen accurately is the most engaging thing that can happen in a conversation like this.
- Never ask two questions in one message.
- Never stack a question onto an observation just to be safe — if you make an observation, let it
  stand on its own and trust them to respond to it.`;

// Which end of the scale means what. personalityService reads MBTI signals as negative = first
// letter, positive = second letter, and Big Five as 0 = low, 1 = high. Without this spelled out
// the model has to guess the direction, and it guessed differently per answer — which flipped
// clearly introverted, planning, logic-led people into E/P/F types in testing.
const MBTI_SCALE: Record<string, string> = {
  E_I: '-1 = clearly Extraversion (energised by people, thinks out loud), +1 = clearly Introversion (recharges alone, thinks before speaking)',
  S_N: '-1 = clearly Sensing (concrete facts, details, proven methods), +1 = clearly Intuition (big picture, possibilities, new ideas)',
  T_F: '-1 = clearly Thinking (decides by logic and evidence), +1 = clearly Feeling (decides by people, values and harmony)',
  J_P: '-1 = clearly Judging (plans ahead, likes structure and closure), +1 = clearly Perceiving (keeps options open, spontaneous)',
};

export function signalScaleGuide(dimension: string): string {
  const mbti = MBTI_SCALE[dimension];
  if (mbti) return `For "${dimension}" give a number from -1 to 1 where ${mbti}, and 0 = no clear lean either way.`;
  return `For "${dimension}" give a number from 0 to 1 where 0 = very low ${dimension.toLowerCase()}, 1 = very high ${dimension.toLowerCase()}, and 0.5 = average or unclear.`;
}

export function buildOpeningMessagePrompt(params: {
  frameworkSystemPrompt: string;
  dimension: string;
  exampleScenario: string;
  userName: string;
}): string {
  const { frameworkSystemPrompt, dimension, exampleScenario, userName } = params;
  return `
${frameworkSystemPrompt}

TASK: Send the opening message of a chat conversation with ${userName || 'the user'} to begin a
personality assessment disguised as a real conversation — never a quiz, never a numbered
question, never sounding like a script. Say a quick, casual hello and ask something that gets
them talking about themselves in a way that probes dimension "${dimension}". This can be a
situational "what would you do" scenario, or just as easily a plain, open question about their
own opinions, habits, or preferences ("What's something you..." / "How do you usually...") — a
real person starting a chat doesn't only ever pose hypothetical scenarios.
${CHAT_STYLE_RULES}

Example scenario for this dimension, given only as a style/tone reference — do not copy it or
closely resemble it, and don't feel bound to the scenario format it uses: ${JSON.stringify(exampleScenario)}

Respond with ONLY valid JSON, no markdown fences, no commentary, and never use a double-quote
character inside the string value:
{ "next_message": "<your opening message, 1 short sentence, 2 at most, no double-quote characters>" }`.trim();
}

/**
 * The core of every conversational turn after the first: in one call, analyze the answer to
 * the previous message AND decide what to say next — either a natural follow-up on the same
 * dimension (if the answer was too thin to read confidently) or a warm transition into a new
 * scenario for the least-covered dimension. Combining analysis + continuity into one call (vs.
 * the old separate analyze/personalize/follow-up calls) keeps this to exactly one Gemini call
 * per turn, which matters both for latency and for the account's daily request quota.
 */
export function buildConversationTurnPrompt(params: {
  frameworkSystemPrompt: string;
  history: { ai: string; user: string }[];
  lastMessage: string;
  lastAnswer: string;
  lastDimension: string;
  dimensionStreak: number;
  priorSignals: Record<string, number>;
  suggestedNextDimension: string;
  exampleScenario: string;
  validDimensions: string[];
  userName: string;
  alreadyAsked: string[];
}): string {
  const {
    alreadyAsked,
    frameworkSystemPrompt,
    history,
    lastMessage,
    lastAnswer,
    lastDimension,
    dimensionStreak,
    priorSignals,
    suggestedNextDimension,
    exampleScenario,
    validDimensions,
    userName,
  } = params;
  const transcript = history.length
    ? history.map((h) => `You: ${h.ai}\nThem: ${h.user}`).join('\n')
    : '(this is the first exchange)';
  const streakGuidance =
    dimensionStreak >= 3
      ? `You've already spent ${dimensionStreak} messages on this same topic — that's enough, move on to a
new topic now (option b below), don't stay on it again.`
      : `You've spent ${dimensionStreak} message(s) on this topic so far. Staying on it a little longer is
completely fine if you're genuinely curious about something they just said — that's what a real
conversation does. Moving on is also fine if it feels naturally finished. Either is a valid choice
here; don't default to always moving on.`;
  return `
${frameworkSystemPrompt}

This is a real, ongoing chat conversation with ${userName || 'the user'} — never a quiz, never a
numbered question, never sounding like a script, and never a rapid-fire string of unrelated
questions. A real conversation lingers on things that are interesting and moves on when a topic
feels naturally done — it does not treat every reply as a cue to introduce a brand-new topic.

Here's how the conversation has gone so far — this is what you already know about them, and you
should draw on it, not act like each message starts from scratch:
${transcript}

Every message you have sent in this conversation so far, oldest first:
${alreadyAsked.map((m, i) => `${i + 1}. ${m}`).join('\n')}

NO REPEATS (this matters more than anything else):
- Never ask any message above again, and never reword one ("How do you relax on weekends?" and
  "What do you do on a free Saturday?" are the same question).
- Never go back to a situation or life area already covered above (weekends, exams, group
  projects, friends arguing, etc.), not even to probe a different dimension. Pick a fresh
  part of their life: hobbies, family, food, travel, games, online life, chores, sports, money,
  future dreams, school subjects, etc.
- A follow-up (option a) must dig into something NEW they just said. Never re-ask the original
  question in other words.

You just said: ${JSON.stringify(lastMessage)}
They answered: ${JSON.stringify(lastAnswer)}
That message was probing dimension "${lastDimension}". ${streakGuidance}
Signals already collected so far across the conversation (for context, do not repeat): ${JSON.stringify(priorSignals)}

TASK, in one response:
1. Analyze their answer and extract a personality dimension signal for "${lastDimension}".
   ${signalScaleGuide(lastDimension)} Score only what this answer actually shows; if it says
   nothing about this dimension, use the neutral value with low confidence.
2. Decide what to say next — exactly one of:
   a) Stay on this topic: react genuinely to what they said, then ask a natural follow-up that
      digs a little deeper — "What made you feel that way?", "What happened after that?", "What
      do you think about...?" — building on their actual words, not a generic prompt. Use
      "${lastDimension}" as "next_dimension".
   b) Move on: transition into a new scenario or open question probing dimension
      "${suggestedNextDimension}" (the least-covered so far) — and use "${suggestedNextDimension}"
      as "next_dimension". Open with a genuine reaction in a FEW WORDS ONLY — "Nice!", "Ha, fair.",
      "Makes sense." — never a full explanatory sentence about what they said, then move straight
      to the new topic in its own short sentence. It doesn't need to be a hypothetical "would you
      rather" scenario — a plain, open question about their own opinions or habits works just as
      well and often reads more like a real chat. If no natural connection exists, skip the
      reaction and just ask plainly rather than forcing a contrived link.
      Example scenario for that next dimension, given only as a style/tone reference — do not
      copy it, closely resemble it, or feel bound to its scenario format: ${JSON.stringify(exampleScenario)}

   Either way, your message does NOT have to be a question — see the rules below. Reflecting back
   something true you've noticed about them works for both options and is often the better move.
${CHAT_STYLE_RULES}
${TWO_WAY_RULES}

Valid dimension keys: ${JSON.stringify(validDimensions)}. "next_dimension" must be exactly one of
these.

Respond with ONLY valid JSON, no markdown fences, no commentary, and never use a double-quote
character inside any string value:
{
  "dimension_signals": { "${lastDimension}": <number on the scale described in step 1> },
  "confidence": <number 0-1, how confident you are in this reading>,
  "reasoning_summary": "<1-2 sentence plain-language summary, no jargon, no double-quote characters>",
  "next_message": "<your next chat message, 1 short sentence, 2 at most, no double-quote characters>",
  "next_dimension": "<one of the valid dimension keys above>"
}`.trim();
}

/**
 * Scores answers that got no reading during the chat (the AI call failed at the time), all in one
 * call so a busy quota is hit once rather than once per answer. Run just before scoring at submit.
 */
export function buildAnswerRescoringPrompt(params: {
  answers: { question: string; answer: string }[];
  dimensions: string[];
}): string {
  const { answers, dimensions } = params;
  return `
You are reading answers from a personality conversation. For each numbered exchange, give a
signal ONLY for the dimensions that answer clearly shows something about — most answers show one,
some show none. Never guess a dimension the answer does not speak to.

Scales:
${dimensions.map((d) => `- ${signalScaleGuide(d)}`).join('\n')}

Exchanges:
${answers.map((a, i) => `${i}. Question: ${JSON.stringify(a.question)}\n   Answer: ${JSON.stringify(a.answer)}`).join('\n')}

Respond with ONLY valid JSON, no markdown fences, no commentary:
{ "results": [ { "index": <exchange number>, "dimension_signals": { "<dimension>": <number on its scale> }, "confidence": <0-1> } ] }`.trim();
}

export function buildPersonalityScoringPrompt(params: {
  framework: 'BIG_FIVE' | 'MBTI';
  aggregatedSignals: Record<string, number[]>;
}): string {
  const { framework, aggregatedSignals } = params;
  return `
You are a psychometric scoring assistant. You are given aggregated per-dimension signal
readings (already extracted from a structured assessment, one array per dimension) for the
${framework} framework. Combine them into a final score per dimension plus an overall
confidence. Do NOT invent new dimensions. Do NOT treat this as a clinical diagnosis.

Aggregated signals: ${JSON.stringify(aggregatedSignals)}

Respond with ONLY valid JSON:
${
  framework === 'BIG_FIVE'
    ? `{
  "scores": { "OPENNESS": <0-100>, "CONSCIENTIOUSNESS": <0-100>, "EXTRAVERSION": <0-100>, "AGREEABLENESS": <0-100>, "NEUROTICISM": <0-100> },
  "confidence": { "OPENNESS": <0-1>, "CONSCIENTIOUSNESS": <0-1>, "EXTRAVERSION": <0-1>, "AGREEABLENESS": <0-1>, "NEUROTICISM": <0-1> },
  "overall_confidence": <0-1>
}`
    : `{
  "poles": { "E_I": "E"|"I", "S_N": "S"|"N", "T_F": "T"|"F", "J_P": "J"|"P" },
  "scores": { "E_I": <0-100 toward first pole>, "S_N": <0-100>, "T_F": <0-100>, "J_P": <0-100> },
  "confidence": { "E_I": <0-1>, "S_N": <0-1>, "T_F": <0-1>, "J_P": <0-1> },
  "mbti_type": "<4-letter type>",
  "overall_confidence": <0-1>
}`
}`.trim();
}

export function buildCareerRecommendationPrompt(params: {
  personalitySummary: string;
  userContext: Record<string, unknown>;
  careers: { id: string; title: string; description: string; alignedTraits: string[] }[];
}): string {
  const { personalitySummary, userContext, careers } = params;
  return `
You explain career suggestions that a fixed scoring engine has ALREADY chosen and ranked. You do
not choose, add, remove, rank or score careers. Write one explanation for each career listed,
in the same order, using its id. ${SAFEGUARD_CLAUSE}

What the suggestions are based on: answers given in a short conversation about how the person
tends to think and act. They are self-described preferences and tendencies — NOT tested
knowledge or demonstrated skills.

Personality summary (internal, never quote it): ${personalitySummary}
User context: ${JSON.stringify(userContext)}
Careers to explain (id, title, description, tendencies from the answers this work draws on):
${JSON.stringify(careers)}

Rules:
- "why_it_fits": 1-2 sentences that name the tendencies in alignedTraits in plain words. If
  alignedTraits is empty, say the overlap is modest and the career is worth exploring.
- Never give or imply a percentage, score, probability, or a promise of success, employment,
  earnings, admission or suitability. Use "may suit", "worth exploring", "draws on".
- Never compare the person to a famous or real person.
- "current_strengths": only tendencies the person described about themselves, phrased as such
  ("described enjoying..."), never as proven skills. May be empty.
- "skills_to_develop": 2-4 concrete skills the work needs.
- "challenges": one honest sentence about what can be hard in this work.

Respond with ONLY valid JSON:
{
  "recommendations": [
    {
      "career_id": "<id from the list>",
      "why_it_fits": "<1-2 sentences>",
      "current_strengths": ["..."],
      "skills_to_develop": ["..."],
      "challenges": "<1 sentence>"
    }
  ]
}`.trim();
}

/**
 * System prompt for the AI mentor chat widget — a standing, casual chat surface (distinct
 * from the assessment interview above) that a logged-in user can open any time to ask about
 * their results, career options, or what to work on next.
 */
export function buildMentorSystemPrompt(params: { userName: string; reportContext: string; isMinor: boolean }): string {
  const { userName, reportContext, isMinor } = params;
  const minorStyleBlock = isMinor
    ? `
This student is in Class 10, roughly 14-16 years old. Adjust for that:
- Use simple, everyday words — no corporate or self-help phrasing ("align with your strengths",
  "structured way to identify", "leverage", "unlock your potential"). Talk the way an older
  sibling or a favourite teacher would, not a career-services brochure.
- Match their energy exactly. If they text casually or use shorthand ("idk", "tbh", lowercase,
  no punctuation), reply casually too — don't answer teen slang with polished formal sentences.
- Be extra encouraging and low-pressure — "not knowing yet" is completely normal at this age, say
  so plainly rather than dressing it up.
- Never mention or lean on career jargon (industries, verticals, career pivots) — talk about
  subjects, hobbies, and school life instead.`
    : '';
  return `
You are an AI career mentor for ${userName || 'a student'} on a career-assessment platform. You
are warm, encouraging, and direct — like a supportive senior mentor, not a customer-support bot.
You help with career questions, study/skill-building advice, decisions about streams, degrees or
roles, and interpreting their assessment results.

${reportContext}
${minorStyleBlock}

${SAFEGUARD_CLAUSE}

SCOPE — what you do:
- Explain the results already in their report, in plain words. Never create, change or estimate a
  score, rating, ranking or percentage; if asked "how good a fit am I", describe the reasons in the
  report and say the report shows overlap with their answers, not a prediction.
- Help them explore careers, study habits, skills to build and small next steps.
- For facts about a specific career (what the work is, routes in, entry roles, skills), use ONLY
  the REFERENCE section above. If the answer is not there — including salaries, cut-offs, exam
  dates, fees, admission chances or job numbers — say you don't have checked information on that
  and suggest an official source or a counsellor. Never make these up.
- If a reference entry is marked "not yet reviewed", say the details are a starting point to check.
SCOPE — what you don't do:
- No medical, mental-health, legal or financial advice; suggest a qualified person instead.
- Nothing unrelated to studies, careers or growth (homework answers, essays, other topics):
  politely steer back.
- If the student seems upset or unsafe, be kind, suggest talking to a trusted adult or a
  counsellor, and do not try to counsel them yourself.

Style:
- HARD LIMIT: 2-4 sentences, every single reply, no exceptions. If the question needs more than
  that to answer well, give the most useful 2-4 sentences now and offer to go deeper on a specific
  part next, rather than writing it all out at once.
- One short paragraph, never two. No headers, no multi-part structure.
- A short list (2-4 bullet-style items) can replace prose sentences when it's genuinely clearer,
  but the list itself must stay just as short — it is not a loophole for a longer reply.
- Be specific and actionable, not generic advice — ground what you say in what you know about
  them when it's relevant, but don't force it in when it isn't.
- Ask a clarifying question if their message is too vague to give a useful answer.
- Never pretend to be human. If asked directly, be upfront that you are an AI mentor.
- Never use personality-test vocabulary: no type codes (e.g. ENTJ, INFP), no "MBTI", "Big Five",
  "Myers-Briggs", "introvert/extrovert", "neuroticism", "conscientiousness", "openness" and so on,
  and no scores or percentages. Describe behaviour in everyday words instead ("you recharge with
  quiet time", "you like to plan ahead"). If they ask for their "personality type", explain that
  the report describes their strengths and learning style in plain words rather than a label,
  then tell them what those are.`.trim();
}

export function buildReportNarrativePrompt(params: {
  educationLevel: string;
  framework: 'BIG_FIVE' | 'MBTI';
  personalitySummary: string;
  topCareers: string[];
  userContext: Record<string, unknown>;
  learningStyleHint: string;
  studentFirstName: string;
  audience: 'PARENT' | 'STUDENT' | 'PROFESSIONAL';
}): string {
  const { educationLevel, framework, personalitySummary, topCareers, userContext, learningStyleHint, studentFirstName, audience } =
    params;
  // Reader, everyday examples and the "tips" section all follow the audience, so a working
  // professional never gets homework advice and a Class 12 student isn't addressed via parents.
  const reader =
    audience === 'PARENT'
      ? `the PARENTS of ${studentFirstName}, a ${educationLevel} student. Parents are not experts in psychology or careers`
      : audience === 'PROFESSIONAL'
        ? `${studentFirstName}, a working professional reflecting on their career. Speak to an adult with work experience`
        : `${studentFirstName} (${educationLevel}), a student reading their own report; family may read it too`;
  const plainReader = audience === 'PARENT' ? 'a busy parent' : audience === 'PROFESSIONAL' ? 'a busy professional' : 'a student';
  const examples =
    audience === 'PROFESSIONAL'
      ? 'everyday examples from work and life (projects, meetings, deadlines, colleagues, learning new tools)'
      : audience === 'PARENT'
        ? 'everyday examples from school and home (homework, exams, friends, hobbies)'
        : 'everyday examples from studies and life (assignments, exams, projects, friends, part-time work)';
  const tipsInstruction =
    audience === 'PARENT'
      ? `4-5 practical things parents can do at home to support ${studentFirstName} (e.g. "Ask ${studentFirstName} to teach you what they learned today")`
      : audience === 'PROFESSIONAL'
        ? `4-5 practical ways ${studentFirstName} can put this into practice at work or in their own learning (no parent or homework advice)`
        : `4-5 practical ways family or friends can support ${studentFirstName}'s studies and career exploration`;
  return `
You are writing a strengths & learning report. The reader is ${reader}.
Internal scoring framework (NEVER mention it): ${framework}. ${SAFEGUARD_CLAUSE}

Internal personality scores (for your understanding only): ${personalitySummary}
Top career matches: ${JSON.stringify(topCareers)}
User context: ${JSON.stringify(userContext)}

Study-preference signal from the answers (use as the basis for learning_style, do not contradict it):
${learningStyleHint}

WHAT THIS REPORT IS BASED ON: a short conversation in which ${studentFirstName} described how they
usually think and act. Everything is self-described. Do not present any tendency as a tested skill
or proven ability ("${studentFirstName} described enjoying...", "came through in the answers"), and
never imply a chance of success in a career.

LANGUAGE RULES — these matter more than anything else:
- Write about ${studentFirstName} in the third person, using their first name ("${studentFirstName} enjoys...").
- Use simple, warm, everyday English ${plainReader} understands in one read. Short sentences.
- NEVER use personality-test vocabulary: no type codes (e.g. ENTJ, INFP), no "MBTI", "Big Five",
  "Myers-Briggs", "introvert/extrovert", "extraversion", "neuroticism", "conscientiousness",
  "agreeableness", "openness", "sensing", "intuition", "judging", "perceiving", "cognitive
  functions", "psychometric", "dimension", "score" or percentages. Describe behaviour instead
  ("recharges with quiet time", "likes to plan ahead").
- Use ${examples}.
- Tendency language ("usually", "tends to"), never fixed labels. Always encouraging.

For "personality_analysis": 4-5 sentences describing what ${studentFirstName} is like day-to-day —
how they think, work, get along with others, and what gives them energy.

For "learning_style": "type" must be exactly "Study ideas to try". Do NOT call ${studentFirstName}
any kind of learner (no "visual learner", "learns best by...") — fixed learning styles are not
supported by evidence. The description (2-3 sentences) says which ways of studying
${studentFirstName} may enjoy trying first, based on preferences in the answers, and that mixing
methods works best for most people. study_tips: 3-5 concrete tips worth trying.

For "parent_tips": ${tipsInstruction}. Concrete, doable this week.

Respond with ONLY valid JSON:
{
  "executive_summary": "<3-4 simple sentences: what came through in ${studentFirstName}'s answers, study ideas to try, and which career areas may be worth exploring>",
  "personality_analysis": "<4-5 sentences>",
  "natural_strengths": ["<a tendency ${studentFirstName} described, with an everyday example of how it might show up>", "..."],
  "development_areas": ["<gentle, positive growth area>", "..."],
  "learning_style": {
    "type": "<one of the labels above>",
    "description": "<3 sentences>",
    "study_tips": ["<tip>", "<tip>", "<tip>"]
  },
  "parent_tips": ["<tip>", "<tip>", "<tip>", "<tip>"],
  "work_study_style": {
    "how_they_learn": "<1 sentence>",
    "how_they_solve_problems": "<1 sentence>",
    "how_they_communicate": "<1 sentence>",
    "how_they_work_with_others": "<1 sentence>",
    "how_they_make_decisions": "<1 sentence>"
  },
  "suggested_skills": ["<2-4 word skill>", "..."],
  "suggested_activities": ["<activity a student can actually do>", "..."],
  "career_risks_considerations": "<2 sentences, calm and reassuring>",
  "action_plan_30_60_90": {
    "day_30": ["<small first step>"],
    "day_60": ["..."],
    "day_90": ["..."]
  }
}`.trim();
}
