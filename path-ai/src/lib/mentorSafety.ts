// Deterministic guardrails around the AI mentor. These run in code, before and after the model,
// so safety never depends on the model following its prompt:
//   1. classifyMessage — spots possible crisis/risk and requests for a human BEFORE any AI call.
//      A crisis message never goes to the model; it gets a fixed, reviewed reply and is flagged.
//   2. guardReply — removes sentences from the AI reply that state percentages, guarantees or
//      pay figures, which the mentor is not allowed to give.
//
// The keyword lists are a starting point, deliberately broad (a false alarm costs a human a
// minute; a miss can cost far more). Tamil and Tanglish terms MUST be reviewed and extended by
// native speakers and a counselling lead before launch — see docs/mentor-scope.md.

export type MessageKind = 'CRISIS' | 'HUMAN_REQUESTED' | 'OK';

const CRISIS_PATTERNS: RegExp[] = [
  // English — self-harm / suicide
  /\b(suicid\w*|kill(ing)? my ?self|end(ing)? (my|it all|my life)|take my (own )?life)\b/i,
  /\b(want(ed)? to die|wish i (was|were) dead|better off dead|no reason to live|don'?t want to (live|be alive|exist))\b/i,
  /\b(self[- ]?harm\w*|cut(ting)? my ?self|hurt(ing)? my ?self|harm(ing)? my ?self)\b/i,
  // English — abuse / immediate danger
  /\b(being (abused|beaten|hit|molested)|(he|she|they|someone) (hits|beats|abuses|touches) me|sexually (abused|harassed)|not safe at home)\b/i,
  // Tamil (needs native review)
  /தற்கொலை/, // suicide
  /சாக(ப் ?போ|ணும்|வேண்டும்|லாம்)/, // want to / going to die
  /உயிரை (மாய்|விட)/, // take / give up my life
  // Tanglish (needs native review)
  /\b(thar?kolai|saaga?num|saga ?poren|sethu ?(poren|poga)|uyir[a-z]* (vida|maai))\b/i,
];

const HUMAN_PATTERNS: RegExp[] = [
  /\b(talk|speak|chat) (to|with) (a |an )?(real |actual )?(person|human|someone real|counsell?or|teacher|mentor in person)\b/i,
  /\b(are you|is this) (a )?(real|human|bot|robot|ai)\b/i,
  /\b(need|want) (a |an )?(real |human )?(counsell?or|person|human)\b/i,
];

export function classifyMessage(text: string): MessageKind {
  if (CRISIS_PATTERNS.some((re) => re.test(text))) return 'CRISIS';
  if (HUMAN_PATTERNS.some((re) => re.test(text))) return 'HUMAN_REQUESTED';
  return 'OK';
}

/**
 * Fixed reply for a possible crisis. Not AI-generated. Helpline numbers MUST be re-verified by
 * the team before launch (they were correct for India at the time of writing):
 * Tele-MANAS 14416 (government mental-health line, 24x7), 112 (emergency), 1098 (children).
 */
export function crisisReply(isMinor: boolean): string {
  const lines = [
    "I'm really glad you told me. What you're feeling matters, and you don't have to deal with it alone.",
    'Please talk to someone right now:',
    '• Tele-MANAS (free, 24x7, many languages incl. Tamil): call 14416',
    '• If you are in danger right now: call 112',
  ];
  if (isMinor) lines.push('• Childline (for anyone under 18): call 1098');
  lines.push(
    isMinor
      ? 'It can also really help to tell a parent, teacher or another adult you trust today.'
      : 'It can also really help to tell someone you trust today.',
    "I'm an AI, so I can't help with this the way a person can — but I'm here to talk about your studies and career whenever you're ready."
  );
  return lines.join('\n');
}

/** Honest answer when someone asks for a person: no promise of a call-back the service can't keep. */
export function humanRequestNote(): string {
  return "Just so you know, I'm an AI mentor, not a person. For a real conversation, a school or college counsellor, a teacher, or someone working in the field you're curious about is a great next step.";
}

// Sentences the mentor must never send. Checked per sentence, so a single bad claim is removed
// without throwing away an otherwise useful reply.
const FORBIDDEN: { rule: string; re: RegExp }[] = [
  { rule: 'percentage', re: /\d+(\.\d+)?\s?(%|per ?cent\b)/i },
  // Promises only. "Career paths don't come with guarantees" is exactly what the mentor SHOULD say,
  // so sentences that deny a guarantee are kept (see NEGATED below).
  { rule: 'guarantee', re: /\b(guarantee[ds]?|100% (sure|certain)|definitely (will|get|become|succeed)|sure to (get|succeed|become)|certain to (get|succeed|become)|you will (definitely|surely|certainly))\b/i },
  { rule: 'pay figure', re: /(₹|\brs\.?\s?\d|\binr\s?\d|\$\s?\d|\b\d+(\.\d+)?\s?(lakh|lakhs|lpa|crore|k per month|per annum)\b)/i },
];

// A guarantee word preceded closely by a negation ("no guarantee", "don't come with guarantees",
// "can't guarantee", "nothing is guaranteed") is a caution, not a promise.
const NEGATED = /\b(no|not|never|nothing|without|cannot|can't|don't|doesn't|isn't|aren't|won't|n't)\b[^.!?]{0,30}\bguarantee/i;

export interface GuardResult {
  text: string;
  violations: string[];
}

export function guardReply(reply: string, fallback = "Sorry, I can't give a reliable answer to that. A counsellor or an official course/college website is the best place to check."): GuardResult {
  const violations: string[] = [];
  // Split into sentences while keeping line structure (bullets) intact.
  const kept = reply
    .split(/\n/)
    .map((line) =>
      (line.match(/[^.!?]+[.!?]*\s*/g) ?? [line])
        .filter((sentence) => {
          const hit = FORBIDDEN.find((f) => f.re.test(sentence) && !(f.rule === 'guarantee' && NEGATED.test(sentence)));
          if (hit) violations.push(hit.rule);
          return !hit;
        })
        .join('')
        .trimEnd()
    )
    .filter((line, i, all) => line.trim() !== '' || (i > 0 && all[i - 1].trim() !== ''))
    .join('\n')
    .trim();
  return { text: kept.length >= 15 ? kept : fallback, violations: [...new Set(violations)] };
}
