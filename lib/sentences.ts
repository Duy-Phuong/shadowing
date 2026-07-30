export interface SavedSentence {
  /** `videoId:sentenceId` — the same sentence saved twice stays one entry. */
  id: string;
  videoId: string;
  /** Title of the video the sentence came from. */
  title: string;
  text: string;
}

/** Builds the stable id for a sentence within a video. */
export function sentenceKey(videoId: string, sentenceId: number): string {
  return `${videoId}:${sentenceId}`;
}

/** Parses newline-delimited JSON sentences, skipping blank/malformed lines. */
export function parseSentences(text: string): SavedSentence[] {
  const result: SavedSentence[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "") continue;
    try {
      const obj = JSON.parse(trimmed) as SavedSentence;
      if (obj && typeof obj.id === "string") result.push(obj);
    } catch {
      // skip malformed line
    }
  }
  return result;
}

/** Serializes sentences to one JSON object per line. */
export function serializeSentences(sentences: SavedSentence[]): string {
  return sentences.map((s) => JSON.stringify(s)).join("\n");
}

/** Adds a sentence unless one with the same id already exists. */
export function addSentence(
  sentences: SavedSentence[],
  sentence: SavedSentence,
): SavedSentence[] {
  if (sentences.some((s) => s.id === sentence.id)) return sentences;
  return [...sentences, sentence];
}

/** Removes the sentence with the given id. */
export function removeSentence(
  sentences: SavedSentence[],
  id: string,
): SavedSentence[] {
  return sentences.filter((s) => s.id !== id);
}
