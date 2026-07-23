import { describe, expect, test } from "vitest";
import {
  addWord,
  parseWordlist,
  removeWord,
  serializeWordlist,
  sortEntries,
  updateWord,
  type WordEntry,
} from "./wordlist";

const a: WordEntry = {
  word: "advent",
  ipa: "/ˈædvɛnt/",
  definition: "a coming",
  partOfSpeech: "noun",
  unit: 2,
};
const b: WordEntry = {
  word: "media",
  ipa: null,
  definition: "mass, communications",
  partOfSpeech: null,
  unit: null,
};

describe("wordlist store (CSV)", () => {
  test("round-trips all fields through parse/serialize", () => {
    expect(parseWordlist(serializeWordlist([a, b]))).toEqual([a, b]);
  });

  test("writes a spreadsheet header row", () => {
    expect(serializeWordlist([]).split(/\r?\n/)[0]).toBe(
      "Name,Type,IPA,Description,Unit",
    );
  });

  test("escapes commas and quotes so Excel reads them correctly", () => {
    const e: WordEntry = {
      word: "quote",
      ipa: null,
      definition: 'say "hi", loudly',
      partOfSpeech: null,
      unit: 1,
    };
    expect(serializeWordlist([e])).toContain('"say ""hi"", loudly"');
    expect(parseWordlist(serializeWordlist([e]))).toEqual([e]);
  });

  test("skips rows without a word", () => {
    const csv = [
      "Name,Type,IPA,Description,Unit",
      "advent,noun,/ˈædvɛnt/,a coming,2",
      ",,,orphan definition,5",
    ].join("\r\n");
    expect(parseWordlist(csv)).toEqual([a]);
  });

  test("addWord dedupes by word (case-insensitive)", () => {
    expect(addWord([a], b)).toEqual([a, b]);
    expect(addWord([a], { ...a, word: "Advent", definition: "x" })).toEqual([a]);
  });

  test("removeWord removes by word (case-insensitive)", () => {
    expect(removeWord([a, b], "ADVENT")).toEqual([b]);
  });
});

describe("updateWord", () => {
  test("merges a patch into the matching word (case-insensitive)", () => {
    expect(updateWord([a, b], "ADVENT", { unit: 5 })).toEqual([
      { ...a, unit: 5 },
      b,
    ]);
  });

  test("leaves the list unchanged when no word matches", () => {
    expect(updateWord([a, b], "missing", { unit: 5 })).toEqual([a, b]);
  });
});

describe("sortEntries", () => {
  const w = (word: string, unit: number | null): WordEntry => ({
    word,
    ipa: null,
    definition: "",
    unit,
  });

  test("sorts by unit ascending and descending", () => {
    const list = [w("a", 3), w("b", 1), w("c", 2)];
    expect(sortEntries(list, "unit", "asc").map((e) => e.word)).toEqual([
      "b",
      "c",
      "a",
    ]);
    expect(sortEntries(list, "unit", "desc").map((e) => e.word)).toEqual([
      "a",
      "c",
      "b",
    ]);
  });

  test("puts missing values last regardless of direction", () => {
    const list = [w("a", null), w("b", 2), w("c", 1)];
    expect(sortEntries(list, "unit", "asc").map((e) => e.word)).toEqual([
      "c",
      "b",
      "a",
    ]);
    expect(sortEntries(list, "unit", "desc").map((e) => e.word)).toEqual([
      "b",
      "c",
      "a",
    ]);
  });

  test("sorts text columns case-insensitively", () => {
    const list = [
      { word: "Banana", ipa: null, definition: "" },
      { word: "apple", ipa: null, definition: "" },
      { word: "cherry", ipa: null, definition: "" },
    ];
    expect(sortEntries(list, "word", "asc").map((e) => e.word)).toEqual([
      "apple",
      "Banana",
      "cherry",
    ]);
  });

  test("does not mutate the input array", () => {
    const list = [w("a", 3), w("b", 1)];
    sortEntries(list, "unit", "asc");
    expect(list.map((e) => e.word)).toEqual(["a", "b"]);
  });
});
