import { describe, expect, test } from "vitest";
import { oxfordUrl } from "./oxford";

describe("oxfordUrl", () => {
  test("builds a lowercase definition URL", () => {
    expect(oxfordUrl("hello")).toBe(
      "https://www.oxfordlearnersdictionaries.com/definition/english/hello",
    );
  });

  test("strips surrounding punctuation and lowercases", () => {
    expect(oxfordUrl("Hello,")).toBe(
      "https://www.oxfordlearnersdictionaries.com/definition/english/hello",
    );
  });

  test("hyphenates multi-word entries", () => {
    expect(oxfordUrl("give up")).toBe(
      "https://www.oxfordlearnersdictionaries.com/definition/english/give-up",
    );
  });
});
