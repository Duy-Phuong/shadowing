import { describe, expect, test } from "vitest";
import { pronunciationAccuracy } from "./pronunciation";

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
