import { describe, expect, test } from "vitest";
import { findTimingProblems, MIN_WINDOW } from "./sentenceTiming";
import type { Sentence } from "./types";

const sentence = (id: number, start: number, end: number): Sentence => ({
  id,
  text: `sentence ${id}`,
  start,
  end,
});

describe("findTimingProblems", () => {
  test("accepts sentences that run forwards with playable windows", () => {
    expect(
      findTimingProblems([
        sentence(0, 0, 2),
        sentence(1, 2, 4.5),
        sentence(2, 4.5, 9),
      ]),
    ).toEqual([]);
  });

  test("reports a sentence that ends before it starts", () => {
    const problems = findTimingProblems([
      sentence(0, 138, 145.6),
      sentence(1, 145.6, 143.1),
    ]);

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("sentence 1");
  });

  test("accepts a window floored to exactly the minimum", () => {
    // What segmentation produces for a sentence its cues left no time for; the
    // subtraction lands a hair under MIN_WINDOW in float arithmetic.
    const start = 263.1333333333333;
    expect(findTimingProblems([sentence(0, start, start + MIN_WINDOW)])).toEqual(
      [],
    );
  });

  test("reports a window too short for the player to observe", () => {
    const problems = findTimingProblems([
      sentence(0, 10, 10 + MIN_WINDOW / 2),
      sentence(1, 10 + MIN_WINDOW / 2, 14),
    ]);

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("sentence 0");
  });

  test("reports starts that go backwards", () => {
    const problems = findTimingProblems([
      sentence(0, 30, 40),
      sentence(1, 20, 40),
    ]);

    expect(problems.some((p) => p.includes("starts before"))).toBe(true);
  });

  test("reports negative times", () => {
    expect(findTimingProblems([sentence(0, -1, 3)])).toHaveLength(1);
  });

  test("has nothing to say about an empty transcript", () => {
    expect(findTimingProblems([])).toEqual([]);
  });
});
