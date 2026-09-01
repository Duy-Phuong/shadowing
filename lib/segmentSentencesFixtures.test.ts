import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { segmentSentences } from "./segmentSentences";
import { findTimingProblems } from "./sentenceTiming";
import type { Cue } from "./types";

/**
 * Real caption tracks, recorded from YouTube. Hand-written cues are too tidy to
 * catch what actually breaks segmentation: `rolling-captions` is the track that
 * once produced sentences ending before they started, hanging the practice loop.
 */
function loadCues(name: string): Cue[] {
  const file = path.join(__dirname, "__fixtures__", `${name}.json`);
  return JSON.parse(readFileSync(file, "utf8")) as Cue[];
}

const FIXTURES = ["rolling-captions", "punctuated-podcast"];

describe("segmentSentences on recorded caption tracks", () => {
  test("the rolling-captions fixture still contains overlapping cues", () => {
    const cues = loadCues("rolling-captions");
    const overlapping = cues.filter(
      (c, i) => i > 0 && c.start < cues[i - 1].start + cues[i - 1].duration,
    );

    // If a re-recording ever loses the overlap, the fixture stops testing
    // anything and the timing checks below would pass for the wrong reason.
    expect(overlapping.length).toBeGreaterThan(50);
  });

  test.each(FIXTURES)("%s produces timing the player can loop", (name) => {
    const sentences = segmentSentences(loadCues(name));

    expect(sentences.length).toBeGreaterThan(50);
    expect(findTimingProblems(sentences)).toEqual([]);
  });
});
