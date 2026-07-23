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
