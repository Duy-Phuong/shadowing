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
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-4 py-16 text-center sm:py-20">
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
          className="flex-1 rounded-lg border border-neutral-300 px-4 py-3 text-base outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700 dark:bg-neutral-900"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || url.trim() === ""}
          className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-40"
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
