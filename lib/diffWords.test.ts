import { describe, expect, test } from "vitest";
import { diffWords } from "./diffWords";

describe("diffWords", () => {
  test("marks every word correct on an exact match (case-insensitive)", () => {
    const result = diffWords("The cat sat", "the CAT sat");

    expect(result).toEqual([
      { type: "correct", expected: "The", typed: "the" },
      { type: "correct", expected: "cat", typed: "CAT" },
      { type: "correct", expected: "sat", typed: "sat" },
    ]);
  });

  test("ignores punctuation when comparing", () => {
    const result = diffWords("Hello, world!", "hello world");

    expect(result.map((t) => t.type)).toEqual(["correct", "correct"]);
  });

  test("flags a substituted word as wrong", () => {
    const result = diffWords("The cat sat", "the dog sat");

    expect(result).toEqual([
      { type: "correct", expected: "The", typed: "the" },
      { type: "wrong", expected: "cat", typed: "dog" },
      { type: "correct", expected: "sat", typed: "sat" },
    ]);
  });

  test("flags an omitted word as missing", () => {
    const result = diffWords("The cat sat down", "the cat down");

    expect(result).toEqual([
      { type: "correct", expected: "The", typed: "the" },
      { type: "correct", expected: "cat", typed: "cat" },
      { type: "missing", expected: "sat" },
      { type: "correct", expected: "down", typed: "down" },
    ]);
  });

  test("flags an inserted word as extra", () => {
    const result = diffWords("The cat sat", "the big cat sat");

    expect(result).toEqual([
      { type: "correct", expected: "The", typed: "the" },
      { type: "extra", typed: "big" },
      { type: "correct", expected: "cat", typed: "cat" },
      { type: "correct", expected: "sat", typed: "sat" },
    ]);
  });

  test("marks all expected words missing when nothing is typed", () => {
    const result = diffWords("Two words", "");

    expect(result).toEqual([
      { type: "missing", expected: "Two" },
      { type: "missing", expected: "words" },
    ]);
  });

  test("returns an empty diff when both sides are empty", () => {
    expect(diffWords("", "")).toEqual([]);
  });
});
