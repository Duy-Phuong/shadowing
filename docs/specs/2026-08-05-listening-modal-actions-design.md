# Listening modal: save, dictation shortcut, clickable transcript

## Problem

The listening modal (Practice → "Practice listening") plays catalogue videos back
to back, but it is a dead end. You can save the highlighted *sentence* and nothing
else: there is no way to keep the video, no way to move from passive listening into
practice, and the transcript is a read-only ticker — if you miss a line you have to
hunt for it with the scrubber.

## Design

Three additions to `ListeningModal`, all acting on the video currently playing.

### Save video

A star toggle in the action row, left of "Save sentence". `Practice` already holds
`bookmarkedIds` and `onToggleBookmark` for the catalogue cards; both are forwarded
into the modal, so the modal reuses the existing `/api/bookmarks` path and toast.
Styled like `SaveSentenceButton` (amber when saved, matching the card star).

### Practice dictation

A button that closes the modal and opens the video on the practice page in
dictation mode. Wiring: `ListeningModal.onPractice(videoId)` →
`Practice.onOpen(videoId, "dictation")` → `openVideoId` in `app/page.tsx`, whose
signature gains an optional `PracticeMode`. When present it calls `setMode` before
loading the transcript; when absent (every existing caller) behaviour is unchanged.

Dictation only — shadowing is what the catalogue cards already open, and a second
button would crowd the row for no new capability.

### Clickable transcript lines

Each line becomes a full-width button: `seekTo(sentence.start)`, `play()`, and set
`activeId` immediately so the highlight responds on the click rather than on the
next 250 ms tick. Playback starts even if the video was paused, matching what
clicking the scrubber already does.

The progress bar needs no wiring — `VideoScrubber` polls `getCurrentTime`, so it
picks up the new position on its next tick.

## Not included

- Resuming at the highlighted sentence when entering dictation; the video opens
  from the top, as it does from a catalogue card.
- Any change to how videos are queued or advanced in the modal.
