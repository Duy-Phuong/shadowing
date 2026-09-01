import { afterEach, describe, expect, test } from "vitest";
import {
  extractText,
  parseLookupResponse,
  pickFlashModels,
  resolveModel,
} from "./gemini";

describe("parseLookupResponse", () => {
  test("parses a clean JSON payload", () => {
    const text = JSON.stringify({
      word: "hello",
      ipa: "/həˈləʊ/",
      type: "exclamation",
      meaning: "xin chào",
    });
    expect(parseLookupResponse(text)).toEqual({
      word: "hello",
      ipa: "/həˈləʊ/",
      type: "exclamation",
      meaning: "xin chào",
      senses: [],
    });
  });

  test("parses examples grouped by part of speech", () => {
    const text = JSON.stringify({
      word: "work",
      ipa: "/wɜːk/",
      type: "v",
      meaning: "làm việc",
      senses: [
        {
          type: "verb",
          examples: [
            {
              pattern: "work for somebody/something",
              sentence: "She works for an engineering company.",
            },
            { sentence: "I've always worked in education." },
          ],
        },
        {
          type: "noun",
          examples: [{ sentence: "He started work as a security guard." }],
        },
      ],
    });

    expect(parseLookupResponse(text).senses).toEqual([
      {
        type: "verb",
        examples: [
          {
            pattern: "work for somebody/something",
            sentence: "She works for an engineering company.",
          },
          { sentence: "I've always worked in education." },
        ],
      },
      {
        type: "noun",
        examples: [{ sentence: "He started work as a security guard." }],
      },
    ]);
  });

  test("holds the model to two examples per part of speech", () => {
    const text = JSON.stringify({
      word: "run",
      ipa: "/rʌn/",
      type: "v",
      meaning: "chạy",
      senses: [
        {
          type: "verb",
          examples: [{ sentence: "A." }, { sentence: "B." }, { sentence: "C." }],
        },
      ],
    });

    expect(parseLookupResponse(text).senses[0].examples).toHaveLength(2);
  });

  test("drops malformed senses rather than failing the lookup", () => {
    const text = JSON.stringify({
      word: "run",
      ipa: "/rʌn/",
      type: "v",
      meaning: "chạy",
      senses: [
        { type: "verb", examples: [{ sentence: "  " }] }, // no usable example
        { type: "", examples: [{ sentence: "Nameless." }] }, // no part of speech
        { type: "noun", examples: "not a list" },
        { type: "noun", examples: [{ sentence: " He went for a run. " }] },
      ],
    });

    expect(parseLookupResponse(text).senses).toEqual([
      { type: "noun", examples: [{ sentence: "He went for a run." }] },
    ]);
  });

  test("survives senses being absent or the wrong type", () => {
    const base = { word: "cat", ipa: "/kæt/", type: "n", meaning: "con mèo" };
    expect(parseLookupResponse(JSON.stringify(base)).senses).toEqual([]);
    expect(
      parseLookupResponse(JSON.stringify({ ...base, senses: "nope" })).senses,
    ).toEqual([]);
  });

  test("tolerates markdown code fences", () => {
    const text =
      '```json\n{"word":"run","ipa":"/rʌn/","type":"v","meaning":"chạy"}\n```';
    expect(parseLookupResponse(text).word).toBe("run");
  });

  test("trims all fields", () => {
    const text = JSON.stringify({
      word: "  cat  ",
      ipa: " /kæt/ ",
      type: " n ",
      meaning: " con mèo ",
    });
    expect(parseLookupResponse(text)).toEqual({
      word: "cat",
      ipa: "/kæt/",
      type: "n",
      meaning: "con mèo",
      senses: [],
    });
  });

  test("throws when the word is missing", () => {
    expect(() => parseLookupResponse('{"ipa":"/x/","type":"n"}')).toThrow();
  });
});

describe("pickFlashModels", () => {
  test("keeps text flash models, drops the models/ prefix and non-text variants", () => {
    const raw = [
      "models/gemini-flash-latest",
      "models/gemini-2.0-flash",
      "models/gemini-2.5-flash-image",
      "models/gemini-2.5-flash-preview-tts",
      "models/gemini-1.5-pro",
    ];
    expect(pickFlashModels(raw)).toEqual([
      "gemini-flash-latest",
      "gemini-2.0-flash",
    ]);
  });

  test("orders -latest aliases first, then the rest sorted, deduped", () => {
    const raw = [
      "gemini-2.0-flash",
      "gemini-flash-lite-latest",
      "gemini-2.0-flash",
      "gemini-flash-latest",
    ];
    expect(pickFlashModels(raw)).toEqual([
      "gemini-flash-latest",
      "gemini-flash-lite-latest",
      "gemini-2.0-flash",
    ]);
  });
});

describe("resolveModel", () => {
  const original = process.env.GEMINI_MODEL;
  afterEach(() => {
    if (original === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = original;
  });

  test("prefers an explicit override", () => {
    process.env.GEMINI_MODEL = "gemini-2.0-flash";
    expect(resolveModel("gemini-3.5-flash")).toBe("gemini-3.5-flash");
  });

  test("falls back to the env var, then the default", () => {
    process.env.GEMINI_MODEL = "gemini-2.0-flash";
    expect(resolveModel()).toBe("gemini-2.0-flash");
    expect(resolveModel("  ")).toBe("gemini-2.0-flash");
    delete process.env.GEMINI_MODEL;
    expect(resolveModel()).toBe("gemini-flash-latest");
  });
});

describe("extractText", () => {
  test("pulls the text part from a generateContent body", () => {
    const body = {
      candidates: [{ content: { parts: [{ text: "hi" }] } }],
    };
    expect(extractText(body)).toBe("hi");
  });

  test("throws when there is no content", () => {
    expect(() => extractText({ candidates: [] })).toThrow();
  });
});
