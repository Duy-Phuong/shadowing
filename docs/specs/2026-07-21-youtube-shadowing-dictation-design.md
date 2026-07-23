# YouTube Shadowing & Dictation App — Design

**Date:** 2026-07-21
**Status:** Approved for planning

## Purpose

A web app for practicing English **shadowing** (listen and repeat) and **dictation**
(type what you hear) using any YouTube video that has captions. The user pastes a
YouTube link; the app fetches the caption track, re-splits it into sentences with
timestamps, and provides per-sentence looping playback for practice.

## Scope

### In scope (v1)
- Paste a YouTube URL and load its existing caption track.
- Re-segment captions into grammatical sentences with start/end timestamps.
- Embedded YouTube player with programmatic playback control.
- **Shadowing mode:** loop a selected sentence at adjustable speed and repeat count.
- **Dictation mode:** hidden text, type what you hear, word-level diff on check.
- Session-only. No database, no accounts, no saved library.

### Explicitly out of scope (v1)
- AI Talk and Dubbing modes.
- Whisper/speech-to-text for videos without captions.
- User accounts, saved video library, progress tracking.
- Accents/IPA display, difficulty levels, topics, games (reference-site features).

## Stack

- **Next.js (App Router) + TypeScript** — one framework for UI and API routes.
- **Tailwind CSS** for styling.
- **YouTube IFrame Player API** for playback control.
- Lightweight client state (React context or Zustand).
- No database.

## Architecture

### Data flow
```
Home page (paste URL)
      │  POST /api/transcript { url }
      ▼
API route ── extract videoId ── fetch caption track ── re-segment ──▶ { videoId, title, sentences[] }
      │
      ▼
Practice page ── YouTube IFrame player + transcript list + mode tabs + controls
```

### Sentence model
```ts
interface Sentence {
  id: number;      // 0-based index
  text: string;    // grammatical sentence
  start: number;   // seconds, for player.seekTo
  end: number;     // seconds, loop boundary
}
```

## Components

### Backend

**`POST /api/transcript`**
- Input: `{ url: string }`.
- Steps:
  1. Extract `videoId` from the URL (support `watch?v=`, `youtu.be/`, `/embed/` forms).
  2. Fetch the caption track behind a single `fetchCaptions(videoId)` module.
  3. Re-segment cues into sentences (see below).
- Output: `{ videoId, title, sentences: Sentence[] }`.
- Errors (RFC-style JSON `{ error, message }`):
  - Invalid/unparseable URL → 400.
  - No captions available → 422 with message "This video has no available transcript."
  - Upstream fetch failure → 502.

**Caption fetching (isolated — main technical risk)**
- `fetchCaptions(videoId)` returns raw timed cues `{ text, start, duration }[]`.
- Primary implementation: `youtube-transcript` npm library.
- Fallback path documented: swap to `youtubei.js` (InnerTube) if YouTube blocks the
  primary. The rest of the app depends only on the cue interface, not the library.

**Sentence re-segmentation** (`segmentSentences(cues) → Sentence[]`, pure function)
- Concatenate cue text into one stream while tracking each character's source cue time.
- Split on sentence-ending punctuation `.?!` (followed by space/end), keeping the
  punctuation with the preceding sentence.
- Each sentence's `start` = time of its first cue; `end` = `start` of the next
  sentence (last sentence `end` = last cue start + duration).
- Trim whitespace; drop empty segments; collapse cue-internal newlines to spaces.

### Frontend

**`YouTubePlayer`** — wraps the IFrame Player API.
- Exposes `play`, `pause`, `seekTo(seconds)`, `setPlaybackRate(rate)`, and a
  `currentTime` poll (≈100ms interval) used for loop boundaries.
- Audio is the embedded video's own audio; no separate download.

**`ModeTabs`** — switches between Shadowing and Dictation.

**`TranscriptList`** — numbered sentences; active sentence highlighted; click to select
and jump. Shows total sentence count.

**`PlaybackControls`** — speed selector (0.5x, 0.75x, 1x, 1.25x, 1.5x), repeat-count
selector, play/pause. Loop logic: on reaching a sentence's `end`, seek back to `start`
until the repeat count is exhausted.

**`ShadowingPanel`** — shows the current sentence text; relies on the loop controls so
the user listens and repeats.

**`DictationPanel`** — hides the sentence text; plays audio for the sentence; provides a
text input; on **Check**, renders a word-level diff:
- correct words (match), missing words, and wrong words highlighted distinctly.
- Diff is a pure function `diffWords(expected, typed) → tokens[]`.

**Practice-page state** — current mode, selected sentence id, speed, repeat count,
player-ready flag. Kept in one store.

## Testing

Unit tests (the pure logic that carries the most risk):
- `segmentSentences`: cues with mid-sentence splits merge correctly; timestamps map to
  the right cue; punctuation handled; empty/edge cues don't crash.
- `diffWords`: exact match, missing words, extra words, wrong words, case/punctuation
  normalization.

Player and UI wiring verified manually in the browser (IFrame API can't run in unit tests).

## Risks

1. **YouTube caption fetching may break** — YouTube periodically changes its endpoints.
   Mitigated by isolating fetch behind one module with a documented `youtubei.js` fallback.
2. **Timestamp granularity** — sentence boundaries align to cue boundaries, so loop
   points are approximate to within a cue. Acceptable for practice; noted for future
   refinement.
3. **Videos without captions** — surfaced as a clear error, not a silent failure.
