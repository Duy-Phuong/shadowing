import { describe, expect, test } from "vitest";
import {
  addSentence,
  findSentenceIndex,
  parseSentences,
  removeSentence,
  sentenceKey,
  serializeSentences,
  type SavedSentence,
} from "./sentences";

const a: SavedSentence = {
  id: "aaa:0",
  videoId: "aaa",
  title: "A",
  text: "Hello there.",
  start: 0,
  sentenceId: 0,
};
const b: SavedSentence = {
  id: "aaa:1",
  videoId: "aaa",
  title: "A",
  text: "How are you?",
  start: 3.5,
  sentenceId: 1,
};

describe("sentenceKey", () => {
  test("combines video and sentence id", () => {
    expect(sentenceKey("aaa", 3)).toBe("aaa:3");
  });
});

describe("parseSentences", () => {
  test("parses one JSON object per line, skipping blanks and junk", () => {
    const text = `${JSON.stringify(a)}\n\n${JSON.stringify(b)}\nnot json`;
    expect(parseSentences(text)).toEqual([a, b]);
  });

  test("returns an empty array for empty text", () => {
    expect(parseSentences("")).toEqual([]);
  });

  test("defaults start/sentenceId to 0 for entries saved before they existed", () => {
    const legacy = '{"id":"x:0","videoId":"x","title":"X","text":"hi"}';
    expect(parseSentences(legacy)).toEqual([
      { id: "x:0", videoId: "x", title: "X", text: "hi", start: 0, sentenceId: 0 },
    ]);
  });
});

describe("serializeSentences", () => {
  test("round-trips through parse", () => {
    expect(parseSentences(serializeSentences([a, b]))).toEqual([a, b]);
  });
});

describe("addSentence", () => {
  test("appends a new sentence", () => {
    expect(addSentence([a], b)).toEqual([a, b]);
  });

  test("does not duplicate an existing id", () => {
    expect(addSentence([a], { ...a, text: "changed" })).toEqual([a]);
  });
});

describe("removeSentence", () => {
  test("removes by id", () => {
    expect(removeSentence([a, b], "aaa:0")).toEqual([b]);
  });

  test("is a no-op when the id is absent", () => {
    expect(removeSentence([a], "zzz:9")).toEqual([a]);
  });
});

describe("findSentenceIndex", () => {
  const sentences = [
    { start: 0, text: "One." },
    { start: 2, text: "Two." },
    { start: 5, text: "Three." },
  ];

  test("uses the stored index when its text still matches", () => {
    expect(
      findSentenceIndex(sentences, { sentenceId: 2, text: "Three." }),
    ).toBe(2);
  });

  test("falls back to matching by text when the index shifted", () => {
    expect(
      findSentenceIndex(sentences, { sentenceId: 0, text: "Three." }),
    ).toBe(2);
  });

  test("falls back to the sentence playing at the saved timestamp", () => {
    expect(findSentenceIndex(sentences, { start: 4, text: "Missing" })).toBe(1);
    expect(findSentenceIndex(sentences, { start: 5, text: "Missing" })).toBe(2);
  });

  test("returns 0 when nothing matches", () => {
    expect(findSentenceIndex(sentences, { text: "Missing" })).toBe(0);
  });
});
