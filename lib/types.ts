/** A raw caption cue with timing in seconds. */
export interface Cue {
  text: string;
  start: number;
  duration: number;
}

/** A grammatical sentence mapped to player time in seconds. */
export interface Sentence {
  id: number;
  text: string;
  start: number;
  end: number;
}

/** The transcript payload returned by /api/transcript. */
export interface Transcript {
  videoId: string;
  title: string;
  sentences: Sentence[];
  /** Captions look machine-generated (little punctuation), so sentences may run long. */
  autoCaptions?: boolean;
}

export type PracticeMode = "shadowing" | "dictation";
