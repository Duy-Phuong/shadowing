import { describe, expect, test } from "vitest";
import { tokenizeWords } from "./tokenizeWords";

describe("tokenizeWords", () => {
  test("keeps the raw token and a punctuation-stripped lookup key", () => {
    expect(tokenizeWords("But with the advent")).toEqual([
      { raw: "But", lookup: "but" },
      { raw: "with", lookup: "with" },
      { raw: "the", lookup: "the" },
      { raw: "advent", lookup: "advent" },
    ]);
  });

  test("strips trailing punctuation from the lookup but not the raw", () => {
    expect(tokenizeWords("media, us.")).toEqual([
      { raw: "media,", lookup: "media" },
      { raw: "us.", lookup: "us" },
    ]);
  });

  test("keeps internal apostrophes in the lookup", () => {
    expect(tokenizeWords("I'm")).toEqual([{ raw: "I'm", lookup: "i'm" }]);
  });

  test("gives punctuation-only tokens an empty lookup", () => {
    expect(tokenizeWords("well — yes")).toEqual([
      { raw: "well", lookup: "well" },
      { raw: "—", lookup: "" },
      { raw: "yes", lookup: "yes" },
    ]);
  });

  test("returns an empty array for blank input", () => {
    expect(tokenizeWords("   ")).toEqual([]);
  });
});
