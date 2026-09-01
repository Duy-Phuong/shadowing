"use client";

import { useEffect, useState } from "react";
import type { CatalogVideo, Level } from "@/lib/practiceVideos";
import type { Source } from "@/lib/sources";
import type { PracticeMode } from "@/lib/types";
import ConfirmDialog from "./ConfirmDialog";
import ListeningModal from "./ListeningModal";
import { useToast } from "./Toast";

const LEVELS: Level[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
const PAGE_SIZE = 12;

const LEVEL_COLOR: Record<Level, string> = {
  A1: "bg-green-500",
  A2: "bg-green-500",
  B1: "bg-amber-500",
  B2: "bg-amber-500",
  C1: "bg-red-500",
  C2: "bg-red-500",
};

function shuffle<T>(list: T[]): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function Practice({
  onOpen,
  bookmarkedIds,
  onToggleBookmark,
  savedSentenceIds,
  onToggleSentence,
}: {
  onOpen: (videoId: string, mode?: PracticeMode) => void;
  bookmarkedIds: string[];
  onToggleBookmark: (v: { videoId: string; title: string; url: string }) => void;
  savedSentenceIds: string[];
  onToggleSentence: (entry: {
    id: string;
    videoId: string;
    title: string;
    text: string;
    start: number;
    sentenceId: number;
  }) => void;
}) {
  const saved = new Set(bookmarkedIds);
  const [videos, setVideos] = useState<CatalogVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<Source[]>([]);
  const [level, setLevel] = useState<Level | "all">("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [addUrl, setAddUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [showTop, setShowTop] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<Source | null>(null);
  const [listening, setListening] = useState(false);

  const toast = useToast();

  // No synchronous setState here so it's safe to call from an effect.
  const refreshVideos = () =>
    fetch("/api/practice-videos")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: CatalogVideo[]) => {
        setVideos(shuffle(data));
        setVisibleCount(PAGE_SIZE);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

  const reloadVideos = () => {
    setLoading(true);
    void refreshVideos();
  };

  useEffect(() => {
    void refreshVideos();
    fetch("/api/sources")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Source[]) => setSources(data))
      .catch(() => {});
  }, []);

  const filtered =
    level === "all" ? videos : videos.filter((v) => v.level === level);
  const visible = filtered.slice(0, visibleCount);

  // Infinite scroll + back-to-top via the page scroll position. Uses
  // documentElement metrics (robust across browsers) rather than viewport-based
  // IntersectionObserver, which can silently stall.
  useEffect(() => {
    const total = filtered.length;
    const onScroll = () => {
      const doc = document.documentElement;
      setShowTop(doc.scrollTop > 500);
      if (doc.scrollHeight - doc.scrollTop - doc.clientHeight < 800) {
        setVisibleCount((c) => Math.min(c + PAGE_SIZE, total));
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    // Deferred initial check (also re-checks after each load to keep filling).
    const id = window.setTimeout(onScroll, 0);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(id);
    };
  }, [visibleCount, filtered.length]);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const addSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addUrl.trim() === "") return;
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: addUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.message ?? "Couldn't add that channel.");
        return;
      }
      const updated = data as Source[];
      const isDuplicate = updated.length === sources.length;
      setSources(updated);
      setAddUrl("");
      if (isDuplicate) {
        toast("This channel is already added", "info");
      } else {
        toast("Channel added", "success");
        reloadVideos();
      }
    } catch {
      setAddError("Network error. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  const removeSource = async (channelId: string) => {
    const res = await fetch(`/api/sources?channelId=${channelId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setSources((await res.json()) as Source[]);
      reloadVideos();
    }
  };

  const setFilter = (lv: Level | "all") => {
    setLevel(lv);
    setVisibleCount(PAGE_SIZE);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Practice</h1>
      <p className="mb-5 text-neutral-500">
        Shadow real videos from BBC, TED and English channels. Add your own
        channel sources below.
      </p>

      <form onSubmit={addSource} className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={addUrl}
          onChange={(e) => setAddUrl(e.target.value)}
          placeholder="Paste a YouTube channel URL, e.g. https://youtube.com/@SpeakEnglishWithVanessa"
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700 dark:bg-neutral-900"
          disabled={adding}
        />
        <button
          type="submit"
          disabled={adding || addUrl.trim() === ""}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-40"
        >
          {adding ? "Adding…" : "Add source"}
        </button>
      </form>
      {addError && <p className="mb-3 text-sm text-red-500">{addError}</p>}

      {sources.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {sources.map((s) => (
            <span
              key={s.channelId}
              className="flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-xs dark:bg-neutral-800"
            >
              {s.name}
              <button
                onClick={() => setConfirmRemove(s)}
                aria-label={`Remove ${s.name}`}
                className="text-neutral-400 hover:text-red-500"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full px-3 py-1 text-sm font-medium transition ${
            level === "all"
              ? "bg-indigo-600 text-white"
              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          }`}
        >
          All
        </button>
        {LEVELS.map((lv) => (
          <button
            key={lv}
            onClick={() => setFilter(lv)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition ${
              level === lv
                ? "bg-indigo-600 text-white"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${LEVEL_COLOR[lv]}`} />
            {lv}
          </button>
        ))}
        <button
          onClick={() => setListening(true)}
          disabled={filtered.length === 0}
          title="Play videos back to back and listen"
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-40"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M3 14v-2a9 9 0 0 1 18 0v2" />
            <path d="M3 14a2 2 0 0 1 2-2h1v6H5a2 2 0 0 1-2-2zM21 14a2 2 0 0 0-2-2h-1v6h1a2 2 0 0 0 2-2z" />
          </svg>
          Practice listening
        </button>
      </div>

      {loading ? (
        <p className="text-neutral-400">Loading lessons…</p>
      ) : filtered.length === 0 ? (
        <p className="text-neutral-400">No lessons at this level yet.</p>
      ) : (
        <>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((v) => {
              const isSaved = saved.has(v.videoId);
              return (
                <li key={v.videoId} className="relative h-full">
                  <button
                    onClick={() => onOpen(v.videoId)}
                    className="group flex h-full w-full flex-col overflow-hidden rounded-xl border border-neutral-200 text-left transition hover:border-neutral-400 hover:shadow-md dark:border-neutral-800 dark:hover:border-neutral-600"
                  >
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element -- external YouTube thumbnail */}
                      <img
                        src={`https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`}
                        alt=""
                        className="aspect-video w-full object-cover"
                      />
                      <span className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-0.5 text-xs font-medium text-white">
                        {v.channel}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-4">
                      <span className="line-clamp-2 font-semibold">
                        {v.title}
                      </span>
                      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                        {v.level && (
                          <span
                            className={`rounded-md px-2 py-0.5 text-xs font-semibold text-white ${LEVEL_COLOR[v.level]}`}
                          >
                            {v.level}
                          </span>
                        )}
                        {v.topic && (
                          <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500 dark:bg-neutral-800">
                            {v.topic}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() =>
                      onToggleBookmark({
                        videoId: v.videoId,
                        title: v.title,
                        url: `https://www.youtube.com/watch?v=${v.videoId}`,
                      })
                    }
                    aria-label={isSaved ? "Remove from My Videos" : "Save to My Videos"}
                    title={isSaved ? "Saved" : "Save to My Videos"}
                    className={`absolute right-2 top-2 z-10 rounded-full bg-black/60 p-1.5 backdrop-blur transition hover:bg-black/80 ${
                      isSaved ? "text-amber-400" : "text-white"
                    }`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill={isSaved ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                      aria-hidden="true"
                    >
                      <path d="M12 17.3 6.2 20l1.1-6.3-4.6-4.5 6.4-.9L12 2.5l2.9 5.8 6.4.9-4.6 4.5L17.8 20z" />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
          {visible.length < filtered.length && (
            <div className="py-8 text-center text-sm text-neutral-400">
              Loading more…
            </div>
          )}
        </>
      )}

      {showTop && (
        <button
          onClick={scrollToTop}
          aria-label="Back to top"
          title="Back to top"
          className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      )}

      {listening && filtered.length > 0 && (
        <ListeningModal
          videos={filtered}
          bookmarkedIds={bookmarkedIds}
          onToggleBookmark={onToggleBookmark}
          onPractice={(videoId) => {
            setListening(false);
            onOpen(videoId, "dictation");
          }}
          savedSentenceIds={savedSentenceIds}
          onToggleSentence={onToggleSentence}
          onClose={() => setListening(false)}
        />
      )}

      <ConfirmDialog
        open={confirmRemove !== null}
        title="Remove source?"
        message={
          confirmRemove
            ? `Remove “${confirmRemove.name}” and its videos from Practice?`
            : ""
        }
        onCancel={() => setConfirmRemove(null)}
        onConfirm={() => {
          if (confirmRemove) removeSource(confirmRemove.channelId);
          setConfirmRemove(null);
        }}
      />
    </div>
  );
}
