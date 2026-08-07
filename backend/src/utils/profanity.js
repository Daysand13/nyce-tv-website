// Sample word list only — this is the authoritative, server-side check (the frontend's
// client-side check is just for instant feedback and can't be trusted on its own, since
// anyone can call this API directly). Swap this for a maintained moderation library
// (e.g. npm "bad-words", "leo-profanity") or a cloud moderation API before real launch —
// a hand-rolled list is easy to bypass and won't catch variants or other languages.
const BLOCKED_TERMS = new Set(['damn', 'hell', 'crap', 'stupid', 'idiot', 'dumb']);

export function cleanText(text = '') {
  let flagged = false;
  const cleaned = text.replace(/[A-Za-z']+/g, (word) => {
    if (BLOCKED_TERMS.has(word.toLowerCase())) {
      flagged = true;
      return '*'.repeat(word.length);
    }
    return word;
  });
  return { cleaned, flagged };
}
