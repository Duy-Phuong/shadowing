export interface SavedSentence {
  /** `videoId:sentenceId` — the same sentence saved twice stays one entry. */
  id: string;
  videoId: string;
  /** Title of the video the sentence came from. */
  title: string;
  text: string;
  /** Player time (seconds) where the sentence begins. */
  start: number;
  /** Index of the sentence within the transcript when it was saved. */
  sentenceId: number;
}

/** Builds the stable id for a sentence within a video. */
export function sentenceKey(videoId: string, sentenceId: number): string {
  return `${videoId}:${sentenceId}`;
}

/**
 * Locates a saved sentence inside a freshly-loaded transcript so we can jump to
 * it. Prefers the stored index when its text still matches (transcripts are
 * regenerated deterministically), then falls back to matching by text, then to
 * the sentence playing at the saved timestamp. Returns 0 if nothing matches.
 */
export function findSentenceIndex(
  sentences: { start: number; text: string }[],
  target: { sentenceId?: number; start?: number; text?: string },
): number {
  const { sentenceId, start, text } = target;
  if (
    typeof sentenceId === "number" &&
    sentenceId >= 0 &&
    sentenceId < sentences.length &&
    (text === undefined || sentences[sentenceId].text === text)
  ) {
    return sentenceId;
  }
  if (text !== undefined) {
    const byText = sentences.findIndex((s) => s.text === text);
    if (byText !== -1) return byText;
  }
  if (typeof start === "number") {
    let best = 0;
    for (let i = 0; i < sentences.length; i++) {
      if (sentences[i].start <= start + 0.01) best = i;
      else break;
    }
    return best;
  }
  return 0;
}

/** Parses newline-delimited JSON sentences, skipping blank/malformed lines. */
export function parseSentences(text: string): SavedSentence[] {
  const result: SavedSentence[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "") continue;
    try {
      const obj = JSON.parse(trimmed) as Partial<SavedSentence>;
      if (obj && typeof obj.id === "string") {
        result.push({
          id: obj.id,
          videoId: obj.videoId ?? "",
          title: obj.title ?? "",
          text: obj.text ?? "",
          // Entries saved before timestamps existed default to 0.
          start: typeof obj.start === "number" ? obj.start : 0,
          sentenceId: typeof obj.sentenceId === "number" ? obj.sentenceId : 0,
        });
      }
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
