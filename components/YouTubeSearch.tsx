"use client";

import { useState } from "react";
import type { SearchResult } from "@/lib/youtubeSearch";

interface Props {
  onOpen: (videoId: string) => void;
}

export default function YouTubeSearch({ onOpen }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() === "") return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Search failed. Try again.");
        return;
      }
      setResults(data.results as SearchResult[]);
      setSearched(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-16">
      <h2 className="mb-1 text-center text-lg font-semibold">
        Or search YouTube
      </h2>
      <p className="mb-4 text-center text-sm text-neutral-500">
        Find a video by keyword — only videos with captions are shown.
      </p>

      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. English pronunciation tips"
          className="flex-1 rounded-lg border border-neutral-300 px-4 py-3 text-base outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700 dark:bg-neutral-900"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || query.trim() === ""}
          className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-40"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      {loading && (
        <p className="mt-8 text-center text-sm text-neutral-400">
          Searching YouTube and checking captions…
        </p>
      )}

      {!loading && searched && results.length === 0 && !error && (
        <p className="mt-8 text-center text-sm text-neutral-400">
          No captioned videos found — try another search.
        </p>
      )}

      {!loading && results.length > 0 && (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((v) => (
            <li key={v.videoId} className="h-full">
              <button
                onClick={() => onOpen(v.videoId)}
                className="group flex h-full w-full flex-col overflow-hidden rounded-xl border border-neutral-200 text-left transition hover:border-neutral-400 hover:shadow-md dark:border-neutral-800 dark:hover:border-neutral-600"
              >
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element -- external YouTube thumbnail */}
                  <img
                    src={v.thumbnail}
                    alt=""
                    className="aspect-video w-full object-cover"
                  />
                  <span className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-0.5 text-xs font-medium text-white">
                    {v.channel}
                  </span>
                  {v.duration && (
                    <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white">
                      {v.duration}
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <span className="line-clamp-2 font-semibold">{v.title}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
