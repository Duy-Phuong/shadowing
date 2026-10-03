# Shadowing & Dictation

A web app for practicing English **shadowing** (listen and repeat) and **dictation**
(type what you hear) using any YouTube video that has captions. Paste a YouTube
link or search YouTube, and the app fetches the caption track, re-splits it into
sentences with timestamps, and lets you loop each sentence for practice.

Built with Next.js (App Router) + TypeScript + Tailwind CSS.

**English grammar handbook:** https://duy-phuong.github.io/shadowing/ (see
[Grammar handbook](#grammar-handbook)).

## Features

- **Home** — paste a YouTube link or search YouTube, then practice sentence by
  sentence in two modes:
  - **Shadowing** — loop a sentence at adjustable speed and repeat count, then
    speak it back; the browser's speech recognition scores your pronunciation.
  - **Dictation** — the text is hidden; type what you hear and get a
    word-level diff when you check your answer.
  - Auto-next plays straight into the following sentence; click any word for
    its IPA and definition, and save it to your wordlist.
- **Practice** — a catalogue of videos from your saved YouTube channels plus a
  built-in set, filterable by CEFR level (A1–C2). **Practice listening** plays
  random videos back to back with a live, auto-scrolling transcript.
- **My Videos** — starred videos.
- **My Wordlist** — words saved while practicing, with flashcards.
- **My Sentences** — sentences saved from any practice surface; click one to
  reopen its video at the moment it was spoken.
- **Vocabulary** — an editable grid with Excel import/export and an
  **AI lookup** (Gemini) that fills in IPA, part of speech, and a Vietnamese
  meaning.

## Getting Started

Requires Node.js and `make`.

```bash
make install   # install dependencies (first time only)
make dev       # start the dev server
```

Then open [http://localhost:3000](http://localhost:3000) and paste a YouTube link.

The Vocabulary **AI lookup** needs a Gemini API key. Copy
[`.env.example`](.env.example) to `.env.local` and set `GEMINI_API_KEY` (get one
at https://aistudio.google.com/apikey). Everything else works without it.

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
4. Word lookups use [dictionaryapi.dev](https://dictionaryapi.dev/) and the CMU
   pronouncing dictionary for IPA; the Vocabulary AI lookup calls the Gemini API.

Your data is stored as plain files in [`data/`](data), read and written by the
API routes under `app/api/`:

| File | Contents |
|---|---|
| `bookmarks.txt` | Starred videos (My Videos) |
| `sources.txt` | YouTube channels feeding the Practice catalogue |
| `sentences.txt` | Saved sentences (My Sentences) |
| `wordlist.csv` | Saved words (My Wordlist) |
| `vocabulary.json` | Vocabulary grid |

Design notes live in [`docs/specs/`](docs/specs).

## Grammar handbook

[`grammar/english-grammar.html`](grammar/english-grammar.html) is a standalone,
Vietnamese-language English grammar study handbook, published at
**https://duy-phuong.github.io/shadowing/**.

- The [`Publish grammar handbook`](.github/workflows/grammar-pages.yml) GitHub
  Action deploys it to GitHub Pages on every push to `main` that changes the
  file (or run it manually from the Actions tab).
- [`grammar/grammar-src/`](grammar/grammar-src) holds the scripts, fragments,
  and notes used to build it; `assemble.py` stitches the fragments into the
  final HTML.
