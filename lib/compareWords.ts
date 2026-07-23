export type WordStatus = "correct" | "partial" | "wrong" | "empty";

export interface WordResult {
  /** The expected word, original casing/punctuation. */
  expected: string;
  /** What the user typed at this position ("" if not reached yet). */
  typed: string;
  status: WordStatus;
  /** Length of the correctly matched prefix, in normalized characters. */
  matchedChars: number;
}

const normalize = (w: string): string =>
  w.toLowerCase().replace(/[^a-z0-9']/g, "");

const commonPrefix = (a: string, b: string): number => {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
};

const split = (s: string): string[] =>
  s.trim() === "" ? [] : s.trim().split(/\s+/);

/**
 * Positional, live comparison of typed input against the expected sentence,
 * word by word. Each expected word is classified as:
 *  - correct: the typed word matches (ignoring case/punctuation),
 *  - partial: what's typed so far is a correct prefix but incomplete,
 *  - wrong:   the typed word diverges from the expected one,
 *  - empty:   nothing has been typed at this position yet.
 */
export function compareWords(expected: string, typed: string): WordResult[] {
  const expWords = split(expected);
  const typWords = split(typed);

  return expWords.map((word, i) => {
    const t = i < typWords.length ? typWords[i] : "";
    const en = normalize(word);
    const tn = normalize(t);
    const matchedChars = commonPrefix(en, tn);

    let status: WordStatus;
    if (i >= typWords.length) {
      status = "empty";
    } else if (tn.length > 0 && tn === en) {
      status = "correct";
    } else if (tn.length > 0 && matchedChars === tn.length && tn.length < en.length) {
      status = "partial";
    } else {
      status = "wrong";
    }

    return { expected: word, typed: t, status, matchedChars };
  });
}
