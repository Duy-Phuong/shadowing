import { describe, expect, test } from "vitest";
import {
  addSentence,
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
};
const b: SavedSentence = {
  id: "aaa:1",
  videoId: "aaa",
  title: "A",
  text: "How are you?",
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
