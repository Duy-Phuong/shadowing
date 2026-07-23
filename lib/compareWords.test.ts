import { describe, expect, test } from "vitest";
import { compareWords } from "./compareWords";

describe("compareWords", () => {
  test("marks fully typed matches correct and an in-progress prefix partial", () => {
    const result = compareWords("From the moment on", "from the moment o");

    expect(result).toEqual([
      { expected: "From", typed: "from", status: "correct", matchedChars: 4 },
      { expected: "the", typed: "the", status: "correct", matchedChars: 3 },
      { expected: "moment", typed: "moment", status: "correct", matchedChars: 6 },
      { expected: "on", typed: "o", status: "partial", matchedChars: 1 },
    ]);
  });

  test("marks a diverging word wrong and untyped trailing words empty", () => {
    const result = compareWords("cat sat down", "dog");

    expect(result).toEqual([
      { expected: "cat", typed: "dog", status: "wrong", matchedChars: 0 },
      { expected: "sat", typed: "", status: "empty", matchedChars: 0 },
      { expected: "down", typed: "", status: "empty", matchedChars: 0 },
    ]);
  });

  test("ignores case and punctuation when matching whole words", () => {
    const result = compareWords("Hello, world!", "hello");

    expect(result[0].status).toBe("correct");
    expect(result[1].status).toBe("empty");
  });

  test("treats a prefix that later diverges as wrong, not partial", () => {
    const result = compareWords("moment", "moom");

    expect(result[0].status).toBe("wrong");
    expect(result[0].matchedChars).toBe(2); // "mo" matched before diverging
  });

  test("returns all words empty when nothing is typed", () => {
    const result = compareWords("Two words", "");

    expect(result.map((w) => w.status)).toEqual(["empty", "empty"]);
  });
});
