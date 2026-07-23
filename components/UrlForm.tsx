"use client";

import { useState } from "react";
import { fetchTranscript } from "@/lib/loadTranscript";
import type { Transcript } from "@/lib/types";

interface Props {
  onLoaded: (transcript: Transcript) => void;
}

export default function UrlForm({ onLoaded }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      onLoaded(await fetchTranscript(url));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 py-20 text-center">
      <h1 className="text-4xl font-bold tracking-tight">
        Shadowing &amp; Dictation
      </h1>
      <p className="text-lg text-neutral-500">
        Paste a YouTube link to practice listening and speaking, sentence by
        sentence.
      </p>
      <form onSubmit={submit} className="flex w-full flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="flex-1 rounded-lg border border-neutral-300 px-4 py-3 text-base outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-300"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || url.trim() === ""}
          className="rounded-lg bg-neutral-900 px-6 py-3 font-medium text-white transition hover:bg-neutral-700 disabled:opacity-40 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {loading ? "Loading…" : "Load"}
        </button>
      </form>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <p className="text-xs text-neutral-400">
        Works with videos that have captions available.
      </p>
    </div>
  );
}
