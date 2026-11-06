import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const fetchCaptions = vi.fn();
vi.mock("./youtube", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./youtube")>()),
  fetchCaptions: (id: string) => fetchCaptions(id),
}));

const {
  keepTranscript,
  loadTranscript,
  readStoredTranscript,
  releaseTranscript,
} = await import("./transcriptStore");

const ID = "dQw4w9WgXcQ";
const CUES = [{ text: "Hello there.", start: 0, duration: 2 }];
let dir: string;

const files = async (...parts: string[]) => {
  try {
    return await readdir(path.join(dir, ...parts));
  } catch {
    return [];
  }
};

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "transcripts-"));
  vi.spyOn(process, "cwd").mockReturnValue(dir);
  fetchCaptions.mockReset().mockResolvedValue(CUES);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ title: "Rick" }))),
  );
});
afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  await rm(dir, { recursive: true, force: true });
});

describe("loadTranscript", () => {
  test("downloads once, then serves the local cache", async () => {
    const first = await loadTranscript(ID, false);
    const second = await loadTranscript(ID, false);
    expect(first).toEqual({ videoId: ID, title: "Rick", cues: CUES });
    expect(second).toEqual(first);
    expect(fetchCaptions).toHaveBeenCalledTimes(1);
    expect(await files(".cache", "transcripts")).toEqual([`${ID}.json`]);
    expect(await files("data", "transcripts")).toEqual([]);
  });

  test("stores starred videos in data/", async () => {
    await loadTranscript(ID, true);
    expect(await files("data", "transcripts")).toEqual([`${ID}.json`]);
  });

  test("serves the stored copy when YouTube fails", async () => {
    await loadTranscript(ID, false);
    fetchCaptions.mockRejectedValue(new Error("YouTube changed"));
    expect((await loadTranscript(ID, false)).cues).toEqual(CUES);
  });

  test("rejects ids that aren't video ids", async () => {
    await expect(loadTranscript("../../etc/x", false)).rejects.toThrow("Invalid video id");
    await expect(readStoredTranscript("a/b")).rejects.toThrow("Invalid video id");
  });
});

describe("keepTranscript / releaseTranscript", () => {
  test("starring copies the cached captions into data/ without downloading", async () => {
    await loadTranscript(ID, false);
    await keepTranscript(ID);
    expect(fetchCaptions).toHaveBeenCalledTimes(1);
    expect(await files("data", "transcripts")).toEqual([`${ID}.json`]);
  });

  test("un-starring moves the captions back to the cache", async () => {
    await keepTranscript(ID);
    await rm(path.join(dir, ".cache"), { recursive: true, force: true });
    await releaseTranscript(ID);
    expect(await files("data", "transcripts")).toEqual([]);
    expect(await files(".cache", "transcripts")).toEqual([`${ID}.json`]);
    expect(await readStoredTranscript(ID)).not.toBeNull();
  });
});
