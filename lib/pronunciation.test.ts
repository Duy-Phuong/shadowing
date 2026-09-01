import { describe, expect, test } from "vitest";
import { bestTranscript, pronunciationAccuracy } from "./pronunciation";

describe("pronunciationAccuracy", () => {
  test("100 when every word matches", () => {
    expect(pronunciationAccuracy("the cat sat", "the cat sat")).toBe(100);
  });

  test("counts only correct words (case/punctuation-insensitive)", () => {
    // "the" and "sat" correct, "dog" wrong -> 2/3
    expect(pronunciationAccuracy("The cat sat.", "the dog sat")).toBe(67);
  });

  test("0 when nothing is heard", () => {
    expect(pronunciationAccuracy("two words", "")).toBe(0);
  });

  test("0 for an empty expected sentence", () => {
    expect(pronunciationAccuracy("", "anything")).toBe(0);
  });
});

describe("bestTranscript", () => {
  test("picks the alternative closest to the expected sentence", () => {
    const alts = ["mustache with mustard", "but as with", "but has whip"];
    expect(bestTranscript("But as with", alts)).toBe("but as with");
  });

  test("returns the first when none match", () => {
    expect(bestTranscript("the cat sat", ["dog ran", "bird flew"])).toBe(
      "dog ran",
    );
  });

  test("returns an empty string with no alternatives", () => {
    expect(bestTranscript("hello", [])).toBe("");
  });
});
