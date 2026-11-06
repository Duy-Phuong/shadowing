import { NextResponse } from "next/server";
import { hasCaptions } from "@/lib/youtube";
import {
  parseContinuationResponse,
  parseSearchPage,
  type SearchPage,
  type SearchResult,
} from "@/lib/youtubeSearch";

interface ErrorBody {
  error: string;
  message: string;
}

/** What the client sends back to get the page after this one. */
interface NextPage {
  continuation: string;
  clientVersion: string;
}

const fail = (status: number, error: string, message: string) =>
  NextResponse.json<ErrorBody>({ error, message }, { status });

// One YouTube results page yields ~20 hits; we caption-verify all of them and
// return every captioned one. Nothing is capped, so "Load more" skips nothing.
const FALLBACK_CLIENT_VERSION = "2.20250101.00.00";
const TOKEN = /^[A-Za-z0-9_%=-]{1,4096}$/;
const CLIENT_VERSION = /^[\d.]{1,30}$/;

// Whether a video has captions rarely changes, and checking costs a full watch
// page download, so remember the answer for a few hours.
const CAPTION_TTL_MS = 6 * 60 * 60 * 1000;
const captionCache = new Map<string, { ok: boolean; ts: number }>();

async function hasCaptionsCached(videoId: string): Promise<boolean> {
  const hit = captionCache.get(videoId);
  if (hit && Date.now() - hit.ts < CAPTION_TTL_MS) return hit.ok;
  const ok = await hasCaptions(videoId);
  if (captionCache.size > 5000) captionCache.clear();
  captionCache.set(videoId, { ok, ts: Date.now() });
  return ok;
}

async function firstPage(
  query: string,
): Promise<SearchPage & { clientVersion: string | null }> {
  const res = await fetch(
    `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
    { headers: { "Accept-Language": "en-US" } },
  );
  if (!res.ok) throw new Error(`status ${res.status}`);
  return parseSearchPage(await res.text());
}

async function nextPage(next: NextPage): Promise<SearchPage> {
  const res = await fetch(
    "https://www.youtube.com/youtubei/v1/search?prettyPrint=false",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept-Language": "en-US" },
      body: JSON.stringify({
        context: {
          client: { clientName: "WEB", clientVersion: next.clientVersion, hl: "en", gl: "US" },
        },
        continuation: next.continuation,
      }),
    },
  );
  if (!res.ok) throw new Error(`status ${res.status}`);
  return parseContinuationResponse(await res.json());
}

export async function POST(request: Request) {
  let body: { query?: unknown; next?: Partial<NextPage> };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail(400, "invalid_request", "Request body must be JSON.");
  }

  let page: SearchPage;
  let clientVersion = FALLBACK_CLIENT_VERSION;
  try {
    if (body.next) {
      const { continuation, clientVersion: version } = body.next;
      if (typeof continuation !== "string" || !TOKEN.test(continuation)) {
        return fail(400, "invalid_request", "Invalid page token.");
      }
      if (typeof version === "string" && CLIENT_VERSION.test(version)) {
        clientVersion = version;
      }
      page = await nextPage({ continuation, clientVersion });
    } else {
      const query = body.query;
      if (typeof query !== "string" || query.trim() === "") {
        return fail(400, "invalid_request", "A search query is required.");
      }
      if (query.length > 200) {
        return fail(400, "invalid_request", "That search is too long.");
      }
      const first = await firstPage(query.trim());
      if (first.clientVersion) clientVersion = first.clientVersion;
      page = first;
    }
  } catch {
    return fail(502, "fetch_failed", "Couldn't reach YouTube. Try again.");
  }

  // Verify captions in parallel, then keep the original result order.
  const captioned = await Promise.all(
    page.results.map((h) => hasCaptionsCached(h.videoId)),
  );
  const results: SearchResult[] = page.results.filter((_, i) => captioned[i]);

  const next: NextPage | null = page.continuation
    ? { continuation: page.continuation, clientVersion }
    : null;
  return NextResponse.json({ results, next });
}
