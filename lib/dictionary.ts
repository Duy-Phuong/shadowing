export interface WordDefinition {
  definition: string;
  example?: string;
}

export interface WordMeaning {
  partOfSpeech: string;
  definitions: WordDefinition[];
}

export interface WordInfo {
  word: string;
  ipa: string | null;
  meanings: WordMeaning[];
}

interface RawPhonetic {
  text?: string;
}
interface RawDefinition {
  definition?: string;
  example?: string;
}
interface RawMeaning {
  partOfSpeech?: string;
  definitions?: RawDefinition[];
}
interface RawEntry {
  word?: string;
  phonetic?: string;
  phonetics?: RawPhonetic[];
  meanings?: RawMeaning[];
}

const MAX_MEANINGS = 3;
const MAX_DEFINITIONS = 2;

/**
 * Normalizes a Free Dictionary API (dictionaryapi.dev) response into a compact
 * WordInfo. Returns an empty shape when the word has no entry (404 body).
 */
export function normalizeDictionaryEntry(json: unknown, word: string): WordInfo {
  const entry = Array.isArray(json) ? (json[0] as RawEntry | undefined) : undefined;
  if (!entry) return { word, ipa: null, meanings: [] };

  const ipa =
    entry.phonetics?.find((p) => p.text && p.text.trim() !== "")?.text ??
    entry.phonetic ??
    null;

  const meanings: WordMeaning[] = (entry.meanings ?? [])
    .slice(0, MAX_MEANINGS)
    .map((m) => ({
      partOfSpeech: m.partOfSpeech ?? "",
      definitions: (m.definitions ?? [])
        .slice(0, MAX_DEFINITIONS)
        .map((d) =>
          d.example
            ? { definition: d.definition ?? "", example: d.example }
            : { definition: d.definition ?? "" },
        ),
    }));

  return { word: entry.word ?? word, ipa, meanings };
}
