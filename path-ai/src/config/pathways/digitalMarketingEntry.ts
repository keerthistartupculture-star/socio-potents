// Pilot pathway content: Digital Marketing, entry level (Phase 4).
//
// STATUS: DRAFT FOR TRAINER REVIEW. Written as a starting point so trainers and employers have
// something concrete to edit — it has NOT been reviewed by a domain trainer or employer. Skills,
// level descriptors, tasks, marking criteria and answer keys must all be checked and changed by
// them before the pilot (docs/pathway-pilot.md). Pathway.contentStatus stays DRAFT until then,
// and learners see a "draft content" notice.
//
// Every task has two equivalent forms: A (first check) and B (reassessment). Same skills, same
// criteria, same difficulty, different scenario — so progress compares like with like.

export interface LevelDescriptor {
  level: 1 | 2 | 3 | 4;
  label: string;
  descriptor: string;
}

export interface RubricCriterion {
  id: string;
  skillCode: string;
  criterion: string;
  levels: { level: 1 | 2 | 3 | 4; descriptor: string }[];
}

export interface SkillContent {
  code: string;
  name: string;
  description: string;
  levelDescriptors: LevelDescriptor[];
  learningSuggestions: { kind: 'LEARN' | 'PROJECT'; text: string }[];
}

export interface TaskContent {
  code: string;
  kind: 'PRACTICAL' | 'KNOWLEDGE';
  variantGroup: string;
  variant: 'A' | 'B';
  title: string;
  brief: string;
  skillCodes: string[];
  rubric?: RubricCriterion[];
  options?: string[];
  answerIndex?: number;
}

export const LEVEL_LABELS: Record<1 | 2 | 3 | 4, string> = { 1: 'Emerging', 2: 'Developing', 3: 'Secure', 4: 'Strong' };

const levels = (d1: string, d2: string, d3: string, d4: string): LevelDescriptor[] => [
  { level: 1, label: LEVEL_LABELS[1], descriptor: d1 },
  { level: 2, label: LEVEL_LABELS[2], descriptor: d2 },
  { level: 3, label: LEVEL_LABELS[3], descriptor: d3 },
  { level: 4, label: LEVEL_LABELS[4], descriptor: d4 },
];

const crit = (id: string, skillCode: string, criterion: string, d: [string, string, string, string]): RubricCriterion => ({
  id,
  skillCode,
  criterion,
  levels: [
    { level: 1, descriptor: d[0] },
    { level: 2, descriptor: d[1] },
    { level: 3, descriptor: d[2] },
    { level: 4, descriptor: d[3] },
  ],
});

export const DIGITAL_MARKETING_ENTRY = {
  slug: 'digital-marketing-entry',
  title: 'Digital Marketing',
  roleLevel: 'Entry level (e.g. Marketing / Social Media Executive)',
  description:
    'Practical checks of the everyday skills used in a first digital marketing role: writing social posts, knowing who a message is for, planning a small campaign, reading simple results and writing to clients.',
  skills: [
    {
      code: 'SOCIAL_CONTENT',
      name: 'Writing social media content',
      description: 'Writes short posts that are clear, catch attention and tell people what to do next.',
      levelDescriptors: levels(
        'Post is unclear or has no obvious purpose.',
        'Purpose is clear, but the opening or call to action is weak.',
        'Clear, attention-catching post with a specific call to action.',
        'Sharp, original post that fits the platform and makes the next step effortless.'
      ),
      learningSuggestions: [
        { kind: 'LEARN', text: 'Collect 10 posts from local brands you follow and note what the first line and the call to action are.' },
        { kind: 'PROJECT', text: 'Write three versions of one post (different openings) for a shop you know, and ask two people which they would click.' },
      ],
    },
    {
      code: 'AUDIENCE',
      name: 'Knowing the audience',
      description: 'Identifies who a message is for and shapes the words and offer to suit them.',
      levelDescriptors: levels(
        'Audience is not identified, or the message is for "everyone".',
        'Audience is named broadly; the message only partly fits them.',
        'Specific audience with a message, tone and offer that suit them.',
        'Precise audience, with a clear reason why the message will matter to them.'
      ),
      learningSuggestions: [
        { kind: 'LEARN', text: 'For three local businesses, write one sentence describing exactly who their customer is (age, place, need).' },
        { kind: 'PROJECT', text: 'Rewrite one post twice: once for students and once for parents. Note what you changed and why.' },
      ],
    },
    {
      code: 'CAMPAIGN_PLANNING',
      name: 'Planning a small campaign',
      description: 'Sets a clear goal, chooses sensible channels and steps, and plans a realistic timeline.',
      levelDescriptors: levels(
        'No clear goal; activities are listed without a plan.',
        'Goal stated but vague; channels chosen without reasons.',
        'Specific goal, sensible channels with reasons, and a realistic timeline.',
        'Well-reasoned plan that anticipates problems and includes a test-and-adjust step.'
      ),
      learningSuggestions: [
        { kind: 'LEARN', text: 'Practise turning vague goals ("get more customers") into specific ones ("20 trial sign-ups in 2 weeks").' },
        { kind: 'PROJECT', text: 'Plan a 1-week promotion for a college club event: goal, audience, two channels, and what you will post each day.' },
      ],
    },
    {
      code: 'METRICS',
      name: 'Reading basic results',
      description: 'Reads simple numbers (reach, clicks, sign-ups) and picks the measure that matches the goal.',
      levelDescriptors: levels(
        'Picks the "best" result by the biggest number, whatever the goal.',
        'Compares results, but uses a measure that does not match the goal.',
        'Uses the measure that matches the goal and explains the comparison correctly.',
        'Correct comparison, plus a sensible idea of why it happened and what to test next.'
      ),
      learningSuggestions: [
        { kind: 'LEARN', text: 'Learn the difference between reach, impressions, clicks, click-through rate and conversions, with one example each.' },
        { kind: 'PROJECT', text: 'Track five of your own posts (or a club page) for a week in a simple table, and write two lines on what worked.' },
      ],
    },
    {
      code: 'PRO_COMMUNICATION',
      name: 'Writing to clients and colleagues',
      description: 'Writes clear, polite, well-structured messages that end with a concrete next step.',
      levelDescriptors: levels(
        'Message is unclear, curt or missing key information.',
        'Polite and mostly clear, but rambling or without a next step.',
        'Clear structure, professional tone, and a concrete next step.',
        'Concise and reassuring; handles a difficult point well and moves things forward.'
      ),
      learningSuggestions: [
        { kind: 'LEARN', text: 'Use a simple structure for work emails: thank / answer the point / next step with a date.' },
        { kind: 'PROJECT', text: 'Rewrite two messages you sent recently using that structure and compare them with the originals.' },
      ],
    },
  ] satisfies SkillContent[],

  tasks: [
    // ── P1: social post ──────────────────────────────────────────────
    ...(['A', 'B'] as const).map((variant, i): TaskContent => ({
      code: `DM-P1-${variant}`,
      kind: 'PRACTICAL',
      variantGroup: 'P1',
      variant,
      title: 'Write a social media post',
      brief: [
        'A neighbourhood bakery is launching millet cookies this Saturday. Write an Instagram post (caption only, up to 80 words) that gets local people to visit or order.',
        "A local bookshop is holding a free children's reading hour this Sunday. Write an Instagram post (caption only, up to 80 words) that gets local parents to book a seat.",
      ][i],
      skillCodes: ['SOCIAL_CONTENT', 'AUDIENCE', 'PRO_COMMUNICATION'],
      rubric: [
        crit('hook', 'SOCIAL_CONTENT', 'Opening and clarity', [
          'Opening is unclear or generic; the offer is hard to find.',
          'Offer is clear, but the opening line does not stand out.',
          'Strong first line; the offer is clear within the first sentence.',
          'Memorable, original opening that makes people want to read on.',
        ]),
        crit('audience', 'AUDIENCE', 'Fits the audience', [
          'No sense of who it is for.',
          'Generally suitable but not tailored.',
          'Words, tone and details suit the local audience.',
          'Speaks directly to the audience with a reason that matters to them.',
        ]),
        crit('cta', 'SOCIAL_CONTENT', 'Call to action', [
          'No call to action.',
          'Vague call to action ("check it out").',
          'Specific action with how and when.',
          'Specific, easy action with a light reason to act now.',
        ]),
        crit('tone', 'PRO_COMMUNICATION', 'Tone and accuracy', [
          'Several errors or an unsuitable tone.',
          'A few errors; tone mostly suitable.',
          'Accurate and suitable for the brand.',
          'Polished, on-brand and within the word limit.',
        ]),
      ],
    })),

    // ── P2: mini campaign plan ───────────────────────────────────────
    ...(['A', 'B'] as const).map((variant, i): TaskContent => ({
      code: `DM-P2-${variant}`,
      kind: 'PRACTICAL',
      variantGroup: 'P2',
      variant,
      title: 'Plan a two-week mini campaign',
      brief: [
        'A coaching centre is starting a new evening batch for Class 12 board exams in three weeks. Write a two-week online campaign plan (up to 200 words): the goal, who it is for, which channels and why, what you will post, and how you will know if it worked.',
        'A gym is starting a women-only morning batch in three weeks. Write a two-week online campaign plan (up to 200 words): the goal, who it is for, which channels and why, what you will post, and how you will know if it worked.',
      ][i],
      skillCodes: ['CAMPAIGN_PLANNING', 'AUDIENCE', 'METRICS'],
      rubric: [
        crit('goal', 'CAMPAIGN_PLANNING', 'Specific goal', [
          'No goal, or "get more people".',
          'Goal stated but not measurable.',
          'Measurable goal with a time frame.',
          'Measurable, realistic goal linked to the business need.',
        ]),
        crit('audience', 'AUDIENCE', 'Defined audience', [
          'Audience not defined.',
          'Broad audience.',
          'Specific audience, including who makes the decision.',
          'Specific audience with their main concern addressed.',
        ]),
        crit('channels', 'CAMPAIGN_PLANNING', 'Channels and content, with reasons', [
          'Channels listed with no reasons or plan.',
          'Reasonable channels; content only loosely planned.',
          'Channels justified; content planned across the two weeks.',
          'Well-justified mix, with a sensible order and a test-and-adjust step.',
        ]),
        crit('measure', 'METRICS', 'How success is measured', [
          'No measure.',
          'Measures activity only (likes, posts).',
          'Measure matches the goal (enquiries or sign-ups).',
          'Matching measure plus a mid-way check to adjust the plan.',
        ]),
      ],
    })),

    // ── P3: read simple results ──────────────────────────────────────
    ...(['A', 'B'] as const).map((variant, i): TaskContent => ({
      code: `DM-P3-${variant}`,
      kind: 'PRACTICAL',
      variantGroup: 'P3',
      variant,
      title: 'Read simple campaign results',
      brief: [
        [
          'A bakery posted three Instagram posts. The goal was online orders.',
          'Post 1 (cake photo): reach 4,000 · likes 320 · link clicks 40 · orders 4',
          'Post 2 (customer review reel): reach 2,500 · likes 150 · link clicks 90 · orders 12',
          'Post 3 (offer poster): reach 3,000 · likes 90 · link clicks 60 · orders 9',
          'In up to 120 words: which post did best for the goal, and why? What would you try next week?',
        ].join('\n'),
        [
          'A bookshop sent three newsletter emails with different subject lines. The goal was event registrations.',
          'Email 1: sent 2,000 · opens 700 · clicks 35 · registrations 5',
          'Email 2: sent 2,000 · opens 450 · clicks 60 · registrations 14',
          'Email 3: sent 2,000 · opens 600 · clicks 40 · registrations 8',
          'In up to 120 words: which email did best for the goal, and why? What would you try next time?',
        ].join('\n'),
      ][i],
      skillCodes: ['METRICS', 'CAMPAIGN_PLANNING'],
      rubric: [
        crit('compare', 'METRICS', 'Correct comparison', [
          'Picks the wrong item (for example, the one with the most likes or opens).',
          'Picks the right item but the reasoning is unclear.',
          'Picks the right item and explains it with the numbers.',
          'Correct, and notes why the bigger numbers were misleading.',
        ]),
        crit('goal_measure', 'METRICS', 'Uses the measure that matches the goal', [
          'Ignores the goal.',
          'Mentions the goal but compares on another measure.',
          'Compares on orders or registrations (the goal measure).',
          'Uses the goal measure plus a supporting rate (e.g. per click).',
        ]),
        crit('next', 'CAMPAIGN_PLANNING', 'Sensible next step', [
          'No next step.',
          'Generic next step ("post more").',
          'Specific next step based on what worked.',
          'Specific next step framed as a small test to confirm the finding.',
        ]),
      ],
    })),

    // ── P4: client message ───────────────────────────────────────────
    ...(['A', 'B'] as const).map((variant, i): TaskContent => ({
      code: `DM-P4-${variant}`,
      kind: 'PRACTICAL',
      variantGroup: 'P4',
      variant,
      title: 'Reply to a client',
      brief: [
        'A client (a clothing shop owner) emails: "Our Instagram reach dropped a lot this week. What is going on?" You do not yet know the exact reason. Write your reply (up to 120 words).',
        'A client (a restaurant owner) emails on Thursday evening: "Can we change the whole weekend offer campaign? I want a different dish." The posts are scheduled for Friday morning. Write your reply (up to 120 words).',
      ][i],
      skillCodes: ['PRO_COMMUNICATION', 'CAMPAIGN_PLANNING'],
      rubric: [
        crit('structure', 'PRO_COMMUNICATION', 'Clear structure', [
          'Hard to follow.',
          'Understandable but rambling.',
          'Acknowledges, answers, and closes clearly.',
          'Concise and easy to act on.',
        ]),
        crit('tone', 'PRO_COMMUNICATION', 'Professional and reassuring tone', [
          'Defensive, curt or blaming.',
          'Polite but flat, or over-promises.',
          'Polite, calm and honest about what is not yet known or possible.',
          'Builds trust while being honest about limits.',
        ]),
        crit('next_step', 'CAMPAIGN_PLANNING', 'Concrete next step', [
          'No next step.',
          'Vague ("we will look into it").',
          'Specific action with a time.',
          'Specific action, a time, and an option for the client to choose.',
        ]),
      ],
    })),

    // ── Knowledge questions (auto-marked against the answer key) ─────
    ...[
      {
        g: 'K1', skill: 'METRICS',
        A: { q: 'Click-through rate (CTR) means…', o: ['clicks ÷ impressions', 'likes ÷ followers', 'sales ÷ website visitors', 'impressions ÷ reach'], a: 0 },
        B: { q: 'Conversion rate means…', o: ['sign-ups (or purchases) ÷ visitors', 'visitors ÷ sign-ups', 'likes ÷ shares', 'followers ÷ posts'], a: 0 },
      },
      {
        g: 'K2', skill: 'METRICS',
        A: { q: '1,000 different people saw a post a total of 1,500 times. What is the reach?', o: ['1,500', '1,000', '500', '2,500'], a: 1 },
        B: { q: 'An email was sent to 2,000 people and 500 opened it. What is the open rate?', o: ['10%', '25%', '40%', '50%'], a: 1 },
      },
      {
        g: 'K3', skill: 'SOCIAL_CONTENT',
        A: { q: 'Which is the clearest call to action for a coaching centre?', o: ['We have great offers.', 'Visit our page.', 'Book your free trial class by Friday — tap the link.', 'Follow for more.'], a: 2 },
        B: { q: 'Which is the clearest call to action for a bookshop event?', o: ['Books are great.', 'Something exciting is coming.', "Reserve your free seat for Saturday's reading — reply YES.", 'Like this post.'], a: 2 },
      },
      {
        g: 'K4', skill: 'AUDIENCE',
        A: { q: 'A Class 12 board-exam coaching centre should mainly target…', o: ['everyone in the city', 'Class 11–12 students and their parents nearby', 'college graduates', 'small business owners'], a: 1 },
        B: { q: 'A gym’s women-only morning batch should mainly target…', o: ['teenage boys', 'women nearby who are free in the mornings', 'office workers in another city', 'gym equipment sellers'], a: 1 },
      },
      {
        g: 'K5', skill: 'CAMPAIGN_PLANNING',
        A: { q: 'In an A/B test you…', o: ['post the same ad twice', 'compare two versions that differ in one thing to see which works better', 'ask customers to grade the brand A or B', 'test the website on two browsers'], a: 1 },
        B: { q: 'Why set one clear goal for a campaign?', o: ['So the posts look nicer', 'So you know what to measure and can tell whether it worked', 'Because the law requires it', 'It is not needed'], a: 1 },
      },
      {
        g: 'K6', skill: 'PRO_COMMUNICATION',
        A: { q: 'A client is upset about a delay. The best opening line is…', o: ['Delays happen, nothing we can do.', "Thanks for flagging this — I'm sorry for the delay; here is where things stand.", 'Please read my emails properly.', 'As per my last email…'], a: 1 },
        B: { q: 'A client asks for a last-minute change you cannot finish in time. The most professional reply…', o: ['Ignore it until they ask again', 'Explain what is possible by when, and offer an option', 'Say no without a reason', 'Agree, then miss the deadline'], a: 1 },
      },
    ].flatMap((k) =>
      (['A', 'B'] as const).map((variant): TaskContent => ({
        code: `DM-${k.g}-${variant}`,
        kind: 'KNOWLEDGE',
        variantGroup: k.g,
        variant,
        title: k[variant].q,
        brief: k[variant].q,
        skillCodes: [k.skill],
        options: k[variant].o,
        answerIndex: k[variant].a,
      }))
    ),
  ] satisfies TaskContent[],
};

export const PATHWAY_CONTENT = [DIGITAL_MARKETING_ENTRY];
