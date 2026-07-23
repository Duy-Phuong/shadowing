import type { Transcript } from "./types";

/** Fetches and returns the transcript for a YouTube URL, throwing on error. */
export async function fetchTranscript(url: string): Promise<Transcript> {
  const res = await fetch("/api/transcript", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Something went wrong.");
  return data as Transcript;
}
