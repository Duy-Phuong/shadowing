import { describe, expect, test } from "vitest";
import { segmentSentences } from "./segmentSentences";
import type { Cue } from "./types";

describe("segmentSentences", () => {
  test("joins line-broken cues into one sentence with correct timing", () => {
    const cues: Cue[] = [
      { text: "Hello there", start: 0, duration: 2 },
      { text: "how are you?", start: 2, duration: 2 },
    ];

    const result = segmentSentences(cues);

    expect(result).toEqual([
      { id: 0, text: "Hello there how are you?", start: 0, end: 4 },
    ]);
  });

  test("splits multiple sentences and assigns each its cue start time", () => {
    const cues: Cue[] = [
      { text: "I woke up.", start: 0, duration: 3 },
      { text: "Then I ate. And I", start: 3, duration: 3 },
      { text: "went to work.", start: 6, duration: 4 },
    ];

    const result = segmentSentences(cues);

    expect(result.map((s) => s.text)).toEqual([
      "I woke up.",
      "Then I ate.",
      "And I went to work.",
    ]);
    // "Then I ate." and "And I..." share cue 2, so the second's start is
    // interpolated to mid-cue rather than collapsing onto the cue start.
    expect(result[0]).toMatchObject({ start: 0, end: 3 });
    expect(result[1].start).toBe(3);
    expect(result[1].end).toBeCloseTo(5.12, 1);
    expect(result[2].start).toBeCloseTo(5.12, 1);
    expect(result[2].end).toBe(10);
  });

  test("handles ! and ? terminators", () => {
    const cues: Cue[] = [
      { text: "Watch out! Are you okay?", start: 0, duration: 4 },
    ];

    const result = segmentSentences(cues);

    expect(result.map((s) => s.text)).toEqual(["Watch out!", "Are you okay?"]);
  });

  test("keeps trailing text without a terminator as a final sentence", () => {
    const cues: Cue[] = [
      { text: "This one ends.", start: 0, duration: 2 },
      { text: "This one does not", start: 2, duration: 3 },
    ];

    const result = segmentSentences(cues);

    expect(result.map((s) => s.text)).toEqual([
      "This one ends.",
      "This one does not",
    ]);
    expect(result[1].end).toBe(5);
  });

  test("collapses newlines and extra whitespace inside cues", () => {
    const cues: Cue[] = [
      { text: "Line one\nline two.", start: 0, duration: 2 },
    ];

    const result = segmentSentences(cues);

    expect(result[0].text).toBe("Line one line two.");
  });

  test("ignores empty and whitespace-only cues", () => {
    const cues: Cue[] = [
      { text: "  ", start: 0, duration: 1 },
      { text: "Real sentence.", start: 1, duration: 2 },
      { text: "", start: 3, duration: 1 },
    ];

    const result = segmentSentences(cues);

    expect(result).toEqual([
      { id: 0, text: "Real sentence.", start: 1, end: 3 },
    ]);
  });

  test("returns an empty array for no cues", () => {
    expect(segmentSentences([])).toEqual([]);
  });

  test("gives sentences sharing one cue a non-zero time window", () => {
    const cues: Cue[] = [
      { text: "Hello, I'm Lucy. From the BBC.", start: 0, duration: 6 },
    ];

    const result = segmentSentences(cues);

    expect(result.map((s) => s.text)).toEqual([
      "Hello, I'm Lucy.",
      "From the BBC.",
    ]);
    // The first sentence must have real duration, not start === end.
    expect(result[0].end).toBeGreaterThan(result[0].start);
    expect(result[1].start).toBeGreaterThanOrEqual(result[0].end);
  });

  test("keeps times ordered when cues overlap, as rolling captions do", () => {
    // A later cue starting before the previous one's text has run out. Left
    // alone, the interpolated character times go backwards and a sentence ends
    // before it starts — a window the player can never play through.
    const cues: Cue[] = [
      { text: "Notice the pronunciation. What are you?", start: 138, duration: 8 },
      { text: "What becomes what with a D.", start: 143, duration: 4 },
    ];

    const result = segmentSentences(cues);

    for (let i = 0; i < result.length; i++) {
      expect(result[i].end).toBeGreaterThan(result[i].start);
      if (i > 0) {
        expect(result[i].start).toBeGreaterThanOrEqual(result[i - 1].start);
      }
    }
  });

  test("gives a sentence a playable window even when cues leave it no time", () => {
    // Two sentences whose characters map to the same instant: without a floor
    // the first has a zero-length window and never finishes playing.
    const cues: Cue[] = [
      { text: "Bye. See you.", start: 10, duration: 0 },
      { text: "Next thing.", start: 10, duration: 2 },
    ];

    const result = segmentSentences(cues);

    for (const s of result) {
      expect(s.end - s.start).toBeGreaterThanOrEqual(0.4);
    }
  });

  test("does not split on the dot inside an abbreviation like Mr.", () => {
    const cues: Cue[] = [
      { text: "Mr. Smith arrived. He sat down.", start: 0, duration: 5 },
    ];

    const result = segmentSentences(cues);

    expect(result.map((s) => s.text)).toEqual([
      "Mr. Smith arrived.",
      "He sat down.",
    ]);
  });
});
