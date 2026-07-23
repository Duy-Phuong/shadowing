/** Builds an Oxford Learner's Dictionaries definition URL for a word/phrase. */
export function oxfordUrl(word: string): string {
  const slug = word
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
  return `https://www.oxfordlearnersdictionaries.com/definition/english/${slug}`;
}
