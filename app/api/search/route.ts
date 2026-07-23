import { NextResponse } from "next/server";
import { hasCaptions } from "@/lib/youtube";
import { parseSearchResults, type SearchResult } from "@/lib/youtubeSearch";

interface ErrorBody {
  error: string;
  message: string;
}

const fail = (status: number, error: string, message: string) =>
  NextResponse.json<ErrorBody>({ error, message }, { status });

// One YouTube results page yields ~20 hits; we caption-verify all of them and
// show the captioned ones, capped here. No continuation pages are fetched.
const MAX_RESULTS = 15;

export async function POST(request: Request) {
  let body: { query?: string };
  try {
    body = (await request.json()) as { query?: string };
  } catch {
    return fail(400, "invalid_request", "Request body must be JSON.");
  }

  const query = body.query;
  if (typeof query !== "string" || query.trim() === "") {
    return fail(400, "invalid_request", "A search query is required.");
  }

  let html: string;
  try {
    const res = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim())}`,
      { headers: { "Accept-Language": "en-US" } },
    );
    if (!res.ok) throw new Error(`status ${res.status}`);
    html = await res.text();
  } catch {
    return fail(502, "fetch_failed", "Couldn't reach YouTube. Try again.");
  }

  const hits = parseSearchResults(html);

  // Verify captions in parallel, then keep the original result order.
  const captioned = await Promise.all(hits.map((h) => hasCaptions(h.videoId)));
  const results: SearchResult[] = hits
    .filter((_, i) => captioned[i])
    .slice(0, MAX_RESULTS);

  return NextResponse.json({ results });
}
