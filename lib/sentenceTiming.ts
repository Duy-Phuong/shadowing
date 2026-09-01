import type { Sentence } from "./types";

/**
 * Shortest window a sentence may occupy, in seconds. Comfortably longer than the
 * practice loop's poll interval, so the playhead crossing the end is always seen.
 */
export const MIN_WINDOW = 0.4;

/**
 * Slack for float error. Windows floored to exactly MIN_WINDOW come back a
 * fraction short of it once the times have been added and subtracted.
 */
const EPSILON = 1e-6;

/**
 * Checks the timing a transcript hands to the player: times move forwards and
 * every sentence has a window playback can actually pass through. A transcript
 * that breaks these can't be practised — the loop waits for a playhead that
 * never arrives — so segmentation is expected to keep them, and the API says so
 * out loud rather than leaving it to be discovered as a video that won't stop.
 *
 * Returns one message per problem, empty when the timing is sound.
 */
export function findTimingProblems(sentences: Sentence[]): string[] {
  const problems: string[] = [];

  sentences.forEach((s, i) => {
    if (s.start < 0 || s.end < 0) {
      problems.push(`sentence ${i} has a negative time (${s.start}–${s.end})`);
    }
    if (s.end - s.start < MIN_WINDOW - EPSILON) {
      problems.push(
        `sentence ${i} spans ${(s.end - s.start).toFixed(2)}s ` +
          `(${s.start.toFixed(2)}–${s.end.toFixed(2)}), under the ${MIN_WINDOW}s minimum`,
      );
    }
    if (i > 0 && s.start < sentences[i - 1].start) {
      problems.push(
        `sentence ${i} starts before sentence ${i - 1} ` +
          `(${s.start.toFixed(2)} < ${sentences[i - 1].start.toFixed(2)})`,
      );
    }
  });

  return problems;
}
