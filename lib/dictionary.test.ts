import { describe, expect, test } from "vitest";
import { normalizeDictionaryEntry } from "./dictionary";

const sample = [
  {
    word: "with",
    phonetic: "/wɪð/",
    phonetics: [
      { text: "", audio: "x" },
      { text: "/wɪð/", audio: "y" },
    ],
    meanings: [
      {
        partOfSpeech: "preposition",
        definitions: [
          { definition: "Accompanied by.", example: "I went with her." },
          { definition: "In addition to." },
          { definition: "A third one." },
        ],
      },
    ],
  },
];

describe("normalizeDictionaryEntry", () => {
  test("extracts ipa, part of speech, definitions and examples", () => {
    const result = normalizeDictionaryEntry(sample, "with");

    expect(result).toEqual({
      word: "with",
      ipa: "/wɪð/",
      meanings: [
        {
          partOfSpeech: "preposition",
          definitions: [
            { definition: "Accompanied by.", example: "I went with her." },
            { definition: "In addition to." },
          ],
        },
      ],
    });
  });

  test("limits to two definitions per meaning", () => {
    const result = normalizeDictionaryEntry(sample, "with");
    expect(result.meanings[0].definitions).toHaveLength(2);
  });

  test("falls back to the phonetic field when phonetics lack text", () => {
    const json = [{ word: "tomato", phonetic: "/təˈmɑːtəʊ/", phonetics: [], meanings: [] }];
    expect(normalizeDictionaryEntry(json, "tomato").ipa).toBe("/təˈmɑːtəʊ/");
  });

  test("returns an empty shape for a missing word (404 body)", () => {
    expect(normalizeDictionaryEntry({ title: "No Definitions Found" }, "xyz")).toEqual({
      word: "xyz",
      ipa: null,
      meanings: [],
    });
  });
});
