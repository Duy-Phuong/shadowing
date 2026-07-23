export interface WordToken {
  /** Original token including any attached punctuation. */
  raw: string;
  /** Lowercased dictionary lookup key ("" for punctuation-only tokens). */
  lookup: string;
}

/**
 * Splits a sentence into whitespace-separated tokens, pairing each with a
 * lookup key that has surrounding punctuation removed (internal apostrophes
 * and hyphens preserved).
 */
export function tokenizeWords(sentence: string): WordToken[] {
  const trimmed = sentence.trim();
  if (trimmed === "") return [];
  return trimmed.split(/\s+/).map((raw) => ({
    raw,
    lookup: raw
      .toLowerCase()
      .replace(/^[^a-z0-9']+/, "")
      .replace(/[^a-z0-9']+$/, ""),
  }));
}
