import { NextResponse } from "next/server";
import { addBookmark, removeBookmark, type Bookmark } from "@/lib/bookmarks";
import { readBookmarks, updateBookmarks } from "@/lib/bookmarksFile";
import { isVideoId } from "@/lib/youtube";
import { keepTranscript, releaseTranscript } from "@/lib/transcriptStore";

export async function GET() {
  return NextResponse.json(await readBookmarks());
}

export async function POST(request: Request) {
  let body: Partial<Bookmark>;
  try {
    body = (await request.json()) as Partial<Bookmark>;
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (!body.videoId || !body.title || !body.url || !isVideoId(body.videoId)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const entry: Bookmark = {
    videoId: body.videoId,
    title: body.title,
    url: body.url,
  };
  const updated = await updateBookmarks((list) => addBookmark(list, entry));
  // Keep a copy of the transcript in data/ so this video still opens when
  // YouTube's caption fetch breaks. Runs in the background: starring stays
  // instant even when the transcript has to be downloaded first.
  keepTranscript(entry.videoId).catch((err) =>
    console.warn(`[bookmarks] couldn't save transcript for ${entry.videoId}:`, err),
  );
  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const videoId = new URL(request.url).searchParams.get("videoId");
  if (!videoId) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const updated = await updateBookmarks((list) => removeBookmark(list, videoId));
  if (isVideoId(videoId)) {
    await releaseTranscript(videoId).catch((err) =>
      console.warn(`[bookmarks] couldn't move transcript for ${videoId}:`, err),
    );
  }
  return NextResponse.json(updated);
}
