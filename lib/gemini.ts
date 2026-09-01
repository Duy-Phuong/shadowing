/**
 * Minimal Gemini dictionary lookup. Runs server-side only (needs the API key),
 * asking a fast Gemini model for an Oxford-Learner's-style entry and returning
 * it as structured data. No SDK — just the REST generateContent endpoint.
 */

/** One way the word is used, as a dictionary would print it under a sense. */
export interface Example {
  /** Grammar pattern or collocation, e.g. "work for somebody/something". */
  pattern?: string;
  /** Example sentence showing the word in use. */
  sentence: string;
}

/** The word under one part of speech, with a couple of examples. */
export interface Sense {
  /** Part of speech spelled out, e.g. "verb", "noun". */
  type: string;
  examples: Example[];
}

export interface LookupResult {
  /** The (possibly spelling-corrected) headword. */
  word: string;
  /** IPA transcription, British English, with slashes. */
  ipa: string;
  /** Part of speech as a short abbreviation, e.g. "n", "v", "adj". */
  type: string;
  /** Concise Vietnamese meaning / translation. */
  meaning: string;
  /** Usage examples grouped by part of speech; reference only, never saved. */
  senses: Sense[];
}

/** Most parts of speech to show, and examples per part — a preview, not an entry. */
const MAX_SENSES = 4;
const MAX_EXAMPLES = 2;

// An alias that always points at the current stable Flash model, so it won't
// break when a specific version is retired ("no longer available to new users").
const DEFAULT_MODEL = "gemini-flash-latest";

// Reliable alias models: shown first in the picker and used as a fallback when
// the live model-list request fails. Aliases never hit the "retired" trap.
export const FALLBACK_MODELS = [
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
];

/** Thrown when the API key is not configured, so callers can 503 cleanly. */
export class GeminiNotConfiguredError extends Error {}

/** Resolves the model to use: explicit override → env → built-in default. */
export function resolveModel(override?: string | null): string {
  const o = override?.trim();
  if (o) return o;
  const env = process.env.GEMINI_MODEL?.trim();
  return env || DEFAULT_MODEL;
}

/**
 * Narrows a raw list of model names to the text-generating Flash family and
 * orders it: "-latest" aliases first (most reliable), then the rest sorted.
 * Drops audio/image/tts/embedding variants that can't return a dictionary entry.
 */
export function pickFlashModels(names: string[]): string[] {
  const cleaned = names
    .map((n) => n.replace(/^models\//, ""))
    .filter((n) => n.includes("flash"))
    .filter((n) => !/(tts|image|audio|embedding|vision)/i.test(n));
  const uniq = [...new Set(cleaned)];
  const aliases = uniq.filter((n) => n.endsWith("-latest")).sort();
  const rest = uniq.filter((n) => !n.endsWith("-latest")).sort();
  return [...aliases, ...rest];
}

function buildPrompt(word: string): string {
  return [
    "You are an English–Vietnamese dictionary modelled on the Oxford Learner's Dictionaries.",
    `For the word or phrase "${word}", return a single dictionary entry.`,
    "Correct obvious misspellings and answer for the intended word.",
    "ipa: the British English phonemic transcription wrapped in slashes.",
    "type: the part of speech as a short abbreviation — n (noun), v (verb), adj (adjective), adv (adverb), prep (preposition), conj (conjunction), pron (pronoun), det (determiner), idiom, or phr v (phrasal verb).",
    "meaning: a concise Vietnamese translation or definition of the word.",
    `senses: how the word is actually used, one entry per part of speech it is commonly used as, most common first, at most ${MAX_SENSES}.`,
    "Each sense has type — the part of speech spelled out, e.g. verb, noun, adjective —",
    `and ${MAX_EXAMPLES} short example sentences in English showing typical use.`,
    "Give an example the grammar pattern or collocation it illustrates when the dictionary would show one,",
    'e.g. pattern "work for somebody/something" with sentence "She works for an engineering company.";',
    "leave pattern out when the example simply stands on its own.",
  ].join(" ");
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    word: { type: "string" },
    ipa: { type: "string" },
    type: { type: "string" },
    meaning: { type: "string" },
    senses: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string" },
          examples: {
            type: "array",
            items: {
              type: "object",
              properties: {
                pattern: { type: "string" },
                sentence: { type: "string" },
              },
              required: ["sentence"],
            },
          },
        },
        required: ["type", "examples"],
      },
    },
  },
  required: ["word", "ipa", "type", "meaning", "senses"],
} as const;

/**
 * Parses the model's JSON text into a LookupResult, tolerating markdown code
 * fences. Throws if the payload isn't the expected shape.
 */
/**
 * Pulls the usage examples out of a raw payload, dropping anything malformed and
 * holding the model to the advertised limits. Examples are a display extra, so a
 * bad list costs the examples, never the lookup itself.
 */
function parseSenses(raw: unknown): Sense[] {
  if (!Array.isArray(raw)) return [];
  const senses: Sense[] = [];
  for (const item of raw) {
    const s = item as { type?: unknown; examples?: unknown };
    const type = typeof s.type === "string" ? s.type.trim() : "";
    if (type === "" || !Array.isArray(s.examples)) continue;

    const examples: Example[] = [];
    for (const e of s.examples) {
      const ex = e as { pattern?: unknown; sentence?: unknown };
      const sentence =
        typeof ex.sentence === "string" ? ex.sentence.trim() : "";
      if (sentence === "") continue;
      const pattern =
        typeof ex.pattern === "string" ? ex.pattern.trim() : "";
      examples.push(pattern === "" ? { sentence } : { pattern, sentence });
      if (examples.length === MAX_EXAMPLES) break;
    }

    if (examples.length === 0) continue;
    senses.push({ type, examples });
    if (senses.length === MAX_SENSES) break;
  }
  return senses;
}

export function parseLookupResponse(text: string): LookupResult {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const data = JSON.parse(cleaned) as Record<string, unknown>;
  const word = typeof data.word === "string" ? data.word.trim() : "";
  const ipa = typeof data.ipa === "string" ? data.ipa.trim() : "";
  const type = typeof data.type === "string" ? data.type.trim() : "";
  const meaning = typeof data.meaning === "string" ? data.meaning.trim() : "";
  if (word === "") throw new Error("Gemini returned no word.");
  return { word, ipa, type, meaning, senses: parseSenses(data.senses) };
}

/** Extracts the text part from a generateContent response body. */
export function extractText(body: unknown): string {
  const b = body as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = b?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string" || text.trim() === "") {
    throw new Error("Gemini returned no content.");
  }
  return text;
}

/** Looks a word up via Gemini and returns a structured dictionary entry. */
export async function lookupWord(
  word: string,
  modelOverride?: string,
): Promise<LookupResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.trim() === "") throw new GeminiNotConfiguredError();
  const model = resolveModel(modelOverride);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(word) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.2,
        },
      }),
    },
  );

  if (!res.ok) {
    let reason = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      if (body?.error?.message) reason = body.error.message;
    } catch {
      // response wasn't JSON; keep the status-only reason
    }
    throw new Error(`Gemini error (${res.status}): ${reason}`);
  }

  return parseLookupResponse(extractText(await res.json()));
}
