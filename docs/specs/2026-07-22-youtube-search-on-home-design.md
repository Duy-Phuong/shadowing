# YouTube Search on the Home Page — Design

**Date:** 2026-07-22
**Status:** Draft for review

## Purpose

Let the user find a practice video without leaving the app. Today, starting
practice requires pasting a known YouTube URL (Home) or picking from the curated
Explore catalog. This adds a **search box on the Home view**: type a query, see a
preview grid of matching YouTube videos, click one, and go straight into
shadowing/dictation — no round trip to youtube.com.

## Scope

### In scope
- A search section on the **Home view**, rendered **below** the existing paste-URL form.
- Server-side scrape of YouTube's public search results page (no API key), consistent
  with how the app already scrapes channel pages and RSS feeds.
- Results **pre-filtered to videos that have usable captions**, since the app can only
  practice captioned videos.
- Each result card shows **thumbnail, title, channel, and duration**.
- Clicking a card opens the video for practice via the existing `openVideoId` flow.

### Explicitly out of scope
- Pagination / "load more" / continuation tokens. A single results-page scrape only.
- YouTube Data API v3 or any API key.
- Search filters (level, topic, duration, upload date).
- Persisting searches or search history.
- Changes to the Explore/Practice catalog or the paste-URL form.

## Constraints & decisions

- **No API key.** Search fetches `https://www.youtube.com/results?search_query=<q>`
  server-side and parses the embedded `ytInitialData` JSON. Free, zero setup, but
  dependent on YouTube's markup and subject to rate-limiting. Accepted as consistent
  with the rest of the app.
- **Caption pre-filter.** A raw search page yields ~20 video hits. Each is
  caption-verified in parallel; only captioned videos are shown, **capped at ~15**.
  No continuation pages are fetched, so the typical shown count is ~10–15. This keeps
  a search to one page fetch plus one lightweight caption check per hit.
- **Caption check.** A new `hasCaptions(videoId)` returns a boolean. The current
  `youtube-transcript` library only exposes a full transcript fetch, so the cheapest
  reliable existence check is to fetch the video watch page once and test for a
  `captionTracks` entry in the embedded player response (no transcript XML download,
  no re-segmentation). If that page-scrape proves unreliable, the fallback is to
  attempt a transcript fetch and treat a throw as "no captions". Either way the
  function catches all errors and returns `false` on failure — it is used only for
  pre-filtering, never for playback.

## Architecture

### Data flow

```
User types query on Home
      │
      ▼
POST /api/search { query }
      │
      ├─ fetch youtube.com/results?search_query=<query>   (Accept-Language: en-US)
      ├─ parse ytInitialData → up to ~20 { videoId, title, channel, duration, thumbnail }
      ├─ hasCaptions(videoId) for each hit, in parallel (concurrency-limited)
      └─ keep captioned hits, cap at 15
      │
      ▼
{ results: SearchResult[] }  (or { error, message })
      │
      ▼
YouTubeSearch renders result grid
      │
      ▼
click card → openVideoId(videoId) → POST /api/transcript → practice view
```

### Components & modules

**`lib/youtubeSearch.ts`** (new, unit-tested — mirrors `lib/youtubeChannel.ts`)
- `parseSearchResults(html: string): SearchResult[]` — extracts the `ytInitialData`
  JSON blob from the results page HTML and walks it to collect
  `videoRenderer` entries into `{ videoId, title, channel, duration, thumbnail }`.
- Pure function over an HTML string, so it is tested against saved fixture HTML with
  no network access.

```ts
export interface SearchResult {
  videoId: string;
  title: string;
  channel: string;
  duration: string; // e.g. "12:04" as shown by YouTube; "" if absent (e.g. live)
  thumbnail: string; // https://i.ytimg.com/vi/<id>/hqdefault.jpg
}
```

**`lib/youtube.ts`** (extend)
- `hasCaptions(videoId: string): Promise<boolean>` — cheapest reliable existence check
  for a caption track; catches all errors and returns `false`. Used only for
  pre-filtering, never for playback.

**`app/api/search/route.ts`** (new)
- `POST` with `{ query: string }`.
- Validates a non-empty query (400 on missing/blank).
- Fetches the results page, calls `parseSearchResults`, caption-verifies hits in
  parallel with a small concurrency limit, filters to captioned, caps at 15.
- Returns `{ results }`. On fetch failure returns a 502-style error body
  `{ error, message }`; an empty result set is a normal `200` with `results: []`.
- Mirrors the error-body shape already used by `app/api/transcript/route.ts`.

**`components/YouTubeSearch.tsx`** (new, client component)
- Props: `{ onOpen: (videoId: string) => void }`.
- Local state: `query`, `loading`, `error`, `results`, and a `searched` flag.
- Submit → `POST /api/search`; shows a "Searching…" state (the caption checks take a
  couple seconds, so the affordance matters).
- Renders results as a card grid **reusing the exact visual style of the Explore
  cards** (`components/Practice.tsx`): thumbnail, channel badge, title — plus a
  duration badge overlaid on the thumbnail. No level/topic tags (these are not from
  the curated catalog).
- Empty state after a search with no captioned hits: a short "No captioned videos
  found — try another search." message.
- Clicking a card calls `onOpen(videoId)`.

**`app/page.tsx`** (wire-up)
- The `home` branch currently ends with `return <UrlForm onLoaded={showTranscript} />;`.
  It becomes a small wrapper that renders `<UrlForm .../>` followed by
  `<YouTubeSearch onOpen={openVideoId} />`. `UrlForm` itself is untouched.
- `openVideoId` already exists and already routes to the practice view with the
  correct fallback, so no new navigation logic is needed.

### Error handling

- **Blank query:** button disabled; API also returns 400 as a guard.
- **YouTube fetch fails / markup unparseable:** API returns an error body; the
  component shows the message inline (red text), matching `UrlForm`/`Practice`.
- **Zero captioned results:** normal empty state, not an error.
- **Clicked video turns out unplayable:** already handled by the existing
  `openUrl` fallback in `page.tsx` (returns to Home). The pre-filter makes this rare.
- **Caption check errors:** swallowed inside `hasCaptions` → treated as "no captions".

## Testing

- `lib/youtubeSearch.test.ts` — `parseSearchResults` against a saved results-page
  HTML fixture: extracts expected count, correct ids/titles/channels/durations, and
  returns `[]` for markup with no `videoRenderer` entries. (Follows the existing
  `youtubeChannel.test.ts` fixture-based pattern.)
- `lib/youtube.test.ts` — extend with `hasCaptions` behavior for the error path
  (returns `false` rather than throwing).
- API route and component are thin orchestration over tested units; no new
  integration harness is introduced (consistent with the current codebase, which
  unit-tests `lib/` and keeps routes/components thin).

## Success criteria

1. Typing a query on Home and submitting shows a grid of video cards (thumbnail,
   title, channel, duration) within a few seconds.
2. Every shown result has captions — clicking any card lands in the practice view
   with a loaded transcript.
3. A query with no captioned matches shows a clear empty state, not an error.
4. The paste-URL form and Explore catalog are unchanged in behavior.
5. `parseSearchResults` and `hasCaptions` are covered by passing unit tests.
