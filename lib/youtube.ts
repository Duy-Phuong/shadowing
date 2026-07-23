import { YoutubeTranscript } from "youtube-transcript";
import type { Cue } from "./types";

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Extracts an 11-character YouTube video id from a URL or bare id.
 * Returns null if the input is not a recognizable YouTube reference.
 */
export function extractVideoId(input: string): string | null {
  const value = input.trim();
  if (VIDEO_ID.test(value)) return value;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
  let candidate: string | null = null;

  if (host === "youtu.be") {
    candidate = url.pathname.slice(1);
  } else if (host === "youtube.com") {
    if (url.pathname === "/watch") {
      candidate = url.searchParams.get("v");
    } else if (url.pathname.startsWith("/embed/")) {
      candidate = url.pathname.slice("/embed/".length);
    }
  }

  return candidate && VIDEO_ID.test(candidate) ? candidate : null;
}

/**
 * Cheap existence check for a caption track, used only to pre-filter search
 * results before display (never for playback). Fetches the watch page once and
 * looks for a `captionTracks` entry in the embedded player response, avoiding a
 * full transcript download. Returns false — never throws — on any failure.
 */
export async function hasCaptions(videoId: string): Promise<boolean> {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { "Accept-Language": "en-US" },
    });
    if (!res.ok) return false;
    const html = await res.text();
    return html.includes('"captionTracks"');
  } catch {
    return false;
  }
}

interface RawCue {
  text: string;
  offset: number;
  duration: number;
}

/**
 * Normalizes raw caption cues to a { text, start, duration } shape in seconds.
 * The youtube-transcript library returns milliseconds for the srv3 caption
 * format but seconds for the classic format; a caption cue never lasts longer
 * than ~100s, so a large max duration reliably indicates milliseconds.
 */
export function normalizeCueTiming(raw: RawCue[]): Cue[] {
  const maxDuration = raw.reduce((m, c) => Math.max(m, c.duration), 0);
  const divisor = maxDuration > 100 ? 1000 : 1;
  return raw.map((c) => ({
    text: c.text,
    start: c.offset / divisor,
    duration: c.duration / divisor,
  }));
}

/**
 * Fetches and normalizes the caption track for a video. Throws if captions are
 * unavailable; the library handles the InnerTube/web-page fetch internally.
 */
export async function fetchCaptions(videoId: string): Promise<Cue[]> {
  try {
    // Prefer English so multi-language videos (e.g. TED talks with many
    // translations) don't return a non-English track by default.
    const raw = await YoutubeTranscript.fetchTranscript(videoId, { lang: "en" });
    return normalizeCueTiming(raw);
  } catch {
    // Fall back to the default track when English is unavailable or the
    // language-specific fetch fails for any reason.
    const raw = await YoutubeTranscript.fetchTranscript(videoId);
    return normalizeCueTiming(raw);
  }
}
