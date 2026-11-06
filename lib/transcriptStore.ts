import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { withFileLock, writeFileAtomic } from "./fileStore";
import { fetchCaptions, isVideoId } from "./youtube";
import type { Cue } from "./types";

/**
 * Caption tracks kept on disk so a video opens without asking YouTube again.
 * The raw cues are stored, not the sentences, so improvements to sentence
 * splitting still apply to stored videos.
 *  - data/transcripts: starred videos, committed with the bookmarks.
 *  - .cache/transcripts: every other video opened on this machine (git-ignored).
 */
export interface StoredTranscript {
  videoId: string;
  title: string;
  cues: Cue[];
}

const root = () => process.cwd();
const savedFile = (id: string) => path.join(root(), "data", "transcripts", `${id}.json`);
const cacheFile = (id: string) => path.join(root(), ".cache", "transcripts", `${id}.json`);

function assertVideoId(videoId: string): void {
  // The id becomes a file name; anything else could escape the folder.
  if (!isVideoId(videoId)) throw new Error(`Invalid video id: ${videoId}`);
}

async function readJson(file: string): Promise<StoredTranscript | null> {
  try {
    const data = JSON.parse(await readFile(file, "utf8")) as StoredTranscript;
    return Array.isArray(data?.cues) ? data : null;
  } catch {
    return null;
  }
}

const write = (file: string, t: StoredTranscript) =>
  withFileLock(file, () => writeFileAtomic(file, JSON.stringify(t)));

/** The stored copy of a video's captions, starred copy first; null if none. */
export async function readStoredTranscript(
  videoId: string,
): Promise<StoredTranscript | null> {
  assertVideoId(videoId);
  return (await readJson(savedFile(videoId))) ?? (await readJson(cacheFile(videoId)));
}

async function fetchTitle(videoId: string): Promise<string> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
    );
    if (!res.ok) return "";
    const data = (await res.json()) as { title?: string };
    return data.title ?? "";
  } catch {
    return "";
  }
}

/** Downloads captions and title from YouTube. Throws if captions are unavailable. */
async function download(videoId: string): Promise<StoredTranscript> {
  const [cues, title] = await Promise.all([fetchCaptions(videoId), fetchTitle(videoId)]);
  return { videoId, title, cues };
}

/**
 * Returns the video's captions from disk when stored, otherwise downloads
 * them and stores them — in data/ when `starred`, else in the local cache.
 */
export async function loadTranscript(
  videoId: string,
  starred: boolean,
): Promise<StoredTranscript> {
  assertVideoId(videoId);
  const saved = await readJson(savedFile(videoId));
  if (saved) return saved;
  const cached = await readJson(cacheFile(videoId));
  if (cached) {
    if (starred) await write(savedFile(videoId), cached);
    return cached;
  }
  const fresh = await download(videoId);
  if (fresh.cues.length > 0) {
    await write(starred ? savedFile(videoId) : cacheFile(videoId), fresh);
  }
  return fresh;
}

/** Copies a starred video's captions into data/, downloading them if needed. */
export async function keepTranscript(videoId: string): Promise<void> {
  await loadTranscript(videoId, true);
}

/** Moves an un-starred video's captions from data/ back to the local cache. */
export async function releaseTranscript(videoId: string): Promise<void> {
  assertVideoId(videoId);
  const saved = await readJson(savedFile(videoId));
  if (!saved) return;
  await write(cacheFile(videoId), saved);
  await unlink(savedFile(videoId)).catch(() => {});
}
