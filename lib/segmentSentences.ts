import type { Cue, Sentence } from "./types";

/** Lowercased words that end in a period but do not end a sentence. */
const ABBREVIATIONS = new Set([
  "mr",
  "mrs",
  "ms",
  "dr",
  "prof",
  "st",
  "sr",
  "jr",
  "vs",
  "etc",
  "inc",
  "ltd",
]);

/**
 * Merges line-broken caption cues into grammatical sentences, mapping each
 * sentence to the player time (seconds) of the cue where it begins.
 */
export function segmentSentences(rawCues: Cue[]): Sentence[] {
  const cues = rawCues
    .map((c) => ({ ...c, text: c.text.replace(/\s+/g, " ").trim() }))
    .filter((c) => c.text.length > 0);
  if (cues.length === 0) return [];

  // Combined transcript text plus a per-character time lookup. Times are
  // interpolated across each cue by character position so that multiple
  // sentences sharing one cue get distinct start/end times instead of all
  // collapsing to the cue's start (which yields zero-length loop windows).
  let combined = "";
  const charTime: number[] = [];
  cues.forEach((cue, i) => {
    if (i > 0) {
      combined += " ";
      charTime.push(cue.start);
    }
    const len = cue.text.length;
    for (let j = 0; j < len; j++) {
      combined += cue.text[j];
      charTime.push(cue.start + (j / len) * cue.duration);
    }
  });

  const lastCue = cues[cues.length - 1];
  const finalEnd = lastCue.start + lastCue.duration;

  // Indices of characters that terminate a sentence (inclusive of the mark).
  const boundaries: number[] = [];
  for (let k = 0; k < combined.length; k++) {
    const ch = combined[k];
    if (ch !== "." && ch !== "!" && ch !== "?") continue;

    const next = combined[k + 1];
    const followedByBreak = next === undefined || next === " ";
    if (!followedByBreak) continue;

    if (ch === ".") {
      let s = k - 1;
      while (s >= 0 && /[A-Za-z]/.test(combined[s])) s--;
      const word = combined.slice(s + 1, k).toLowerCase();
      if (ABBREVIATIONS.has(word)) continue;
    }
    boundaries.push(k);
  }

  const sentences: Sentence[] = [];
  const pushSentence = (from: number, toInclusive: number) => {
    let a = from;
    while (a <= toInclusive && combined[a] === " ") a++;
    const text = combined.slice(a, toInclusive + 1).trim();
    if (text.length === 0) return;
    sentences.push({ id: sentences.length, text, start: charTime[a], end: 0 });
  };

  let startIdx = 0;
  for (const b of boundaries) {
    pushSentence(startIdx, b);
    startIdx = b + 1;
  }
  if (combined.slice(startIdx).trim().length > 0) {
    pushSentence(startIdx, combined.length - 1);
  }

  for (let i = 0; i < sentences.length; i++) {
    sentences[i].end =
      i + 1 < sentences.length ? sentences[i + 1].start : finalEnd;
  }

  return sentences;
}
