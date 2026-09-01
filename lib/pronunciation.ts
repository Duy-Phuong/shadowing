import { compareWords, type WordResult } from "./compareWords";

/**
 * Scores a spoken attempt against the expected sentence, reusing the word
 * comparison. Returns the percentage (0–100) of expected words spoken correctly.
 */
export function pronunciationAccuracy(expected: string, heard: string): number {
  const results: WordResult[] = compareWords(expected, heard);
  if (results.length === 0) return 0;
  const correct = results.filter((r) => r.status === "correct").length;
  return Math.round((correct / results.length) * 100);
}

/**
 * Speech recognition returns several guesses; the top one is often wrong even
 * when a later guess matches what was said. Picks the alternative that scores
 * highest against the expected sentence so accented speech is judged fairly.
 */
export function bestTranscript(expected: string, alternatives: string[]): string {
  let best = "";
  let bestScore = -1;
  for (const alt of alternatives) {
    const score = pronunciationAccuracy(expected, alt);
    if (score > bestScore) {
      bestScore = score;
      best = alt;
    }
  }
  return best;
}
