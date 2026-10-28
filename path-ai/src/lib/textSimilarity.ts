// Cheap near-duplicate detection for chat messages, so the assessment never asks the same
// thing twice — not even reworded ("How do you spend weekends?" vs "What do you usually do
// on weekends?"). Word-overlap on content words is plenty for 1-2 sentence messages.

const STOP_WORDS = new Set(
  'a an the and or but if of to in on at for with about from by as is are was were be been do does did you your yours i me my we our it its this that these those what how when where who which why would could should will can just so really usually ever like there their they them have has had not no yes than then some any much more most very too also into out up down over get got feel'.split(
    ' '
  )
);

export function contentWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .map((w) => w.replace(/(ing|ed|es|s)$/, ''))
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  );
}

/** Share of content words the two texts have in common (0-1), relative to the shorter text. */
export function overlap(a: string, b: string): number {
  const wa = contentWords(a);
  const wb = contentWords(b);
  // Too few content words to judge (e.g. "Ha, fair.") — never call that a repeat.
  if (Math.min(wa.size, wb.size) < 3) return 0;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;
  return shared / Math.min(wa.size, wb.size);
}

export function isNearDuplicate(candidate: string, previous: string[], threshold = 0.6): boolean {
  return previous.some((p) => overlap(candidate, p) >= threshold);
}
