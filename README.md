# Shadowing & Dictation

A web app for practicing English **shadowing** (listen and repeat) and **dictation**
(type what you hear) using any YouTube video that has captions. Paste a YouTube
link, and the app fetches the caption track, re-splits it into sentences with
timestamps, and lets you loop each sentence for practice.

Built with Next.js (App Router) + TypeScript + Tailwind CSS.

## Getting Started

Requires Node.js and `make`.

```bash
make install   # install dependencies (first time only)
make dev       # start the dev server
```

Then open [http://localhost:3000](http://localhost:3000) and paste a YouTube link.

> Sentence splitting works best on videos with properly punctuated captions
> (talks, news, podcasts). Auto-generated captions often lack punctuation and
> may collapse into fewer sentences.

## Commands

All commands are wrapped in the [`Makefile`](Makefile):

| Command | Description |
|---|---|
| `make` / `make help` | List all commands |
| `make install` | Install dependencies |
| `make dev` | Start the dev server (http://localhost:3000) |
| `make build` | Create a production build |
| `make start` | Run the production build (after `make build`) |
| `make lint` | Run ESLint |
| `make test` | Run unit tests once |
| `make test-watch` | Run unit tests in watch mode |
| `make clean` | Remove build output and dependencies |

## How it works

1. `POST /api/transcript` extracts the video id, fetches the caption track, and
   re-segments it into sentences (`{ id, text, start, end }`).
2. The practice page embeds the YouTube player (IFrame API) and drives
   per-sentence looping at adjustable speed and repeat count.
3. **Shadowing** loops a sentence so you can repeat it; **Dictation** hides the
   text, plays the audio, and shows a word-level diff when you check your answer.

Design notes live in [`docs/specs/`](docs/specs).
