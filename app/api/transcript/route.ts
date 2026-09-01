import { NextResponse } from "next/server";
import { extractVideoId, fetchCaptions } from "@/lib/youtube";
import { segmentSentences } from "@/lib/segmentSentences";
import { findTimingProblems } from "@/lib/sentenceTiming";

interface ErrorBody {
  error: string;
  message: string;
}

const fail = (status: number, error: string, message: string) =>
  NextResponse.json<ErrorBody>({ error, message }, { status });

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

export async function POST(request: Request) {
  let body: { url?: string };
  try {
    body = (await request.json()) as { url?: string };
  } catch {
    return fail(400, "invalid_request", "Request body must be JSON.");
  }

  const url = body.url;
  if (typeof url !== "string" || url.trim() === "") {
    return fail(400, "invalid_request", "A YouTube URL is required.");
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return fail(400, "invalid_url", "That doesn't look like a YouTube link.");
  }

  let cues;
  try {
    cues = await fetchCaptions(videoId);
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    // The library throws typed errors when a video has no usable transcript.
    if (name.startsWith("YoutubeTranscript")) {
      return fail(
        422,
        "no_transcript",
        "This video has no available transcript.",
      );
    }
    return fail(502, "upstream_error", "Could not reach YouTube. Try again.");
  }

  const sentences = segmentSentences(cues);
  if (sentences.length === 0) {
    return fail(422, "no_transcript", "This video has no available transcript.");
  }

  // Timing the player can't loop through is a segmentation bug, not a bad video.
  // Serve the transcript anyway — reading along still works — but say so here
  // rather than let it surface as sentences that won't stop playing.
  const problems = findTimingProblems(sentences);
  if (problems.length > 0) {
    console.warn(
      `[transcript] ${videoId}: ${problems.length} timing problem(s) in ` +
        `${sentences.length} sentences\n  ${problems.slice(0, 5).join("\n  ")}`,
    );
  }

  const title = await fetchTitle(videoId);
  return NextResponse.json({ videoId, title, sentences });
}
