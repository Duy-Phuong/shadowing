"use client";

import { useState } from "react";
import type { SavedSentence } from "@/lib/sentences";
import ConfirmDialog from "./ConfirmDialog";

/** Formats seconds as m:ss. */
function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

interface Props {
  sentences: SavedSentence[];
  loading: boolean;
  onOpen: (sentence: SavedSentence) => void;
  onRemove: (id: string) => void;
}

export default function SavedSentences({
  sentences,
  loading,
  onOpen,
  onRemove,
}: Props) {
  const [confirmRemove, setConfirmRemove] = useState<SavedSentence | null>(null);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">My Sentences</h1>
      <p className="mb-6 text-neutral-500">
        Sentences you saved while shadowing, doing dictation or listening.
      </p>

      {loading ? (
        <p className="text-neutral-400">Loading…</p>
      ) : sentences.length === 0 ? (
        <p className="text-neutral-400">
          No saved sentences yet. Tap “Save sentence” while practising to keep
          one here.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {sentences.map((s) => (
            <li
              key={s.id}
              className="flex items-start justify-between gap-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <button
                onClick={() => onOpen(s)}
                title="Jump to this moment in the video"
                className="group min-w-0 text-left"
              >
                <p className="text-base transition group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  {s.text}
                </p>
                <span className="mt-1 flex items-center gap-1.5 truncate text-xs text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300">
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-3 w-3 shrink-0"
                    aria-hidden="true"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  {formatTime(s.start)} · {s.title || s.videoId}
                </span>
              </button>
              <button
                onClick={() => setConfirmRemove(s)}
                aria-label="Remove from My Sentences"
                title="Remove from My Sentences"
                className="shrink-0 text-neutral-400 hover:text-red-500"
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
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={confirmRemove !== null}
        title="Remove sentence?"
        message={
          confirmRemove
            ? `Remove “${confirmRemove.text}” from My Sentences?`
            : ""
        }
        onCancel={() => setConfirmRemove(null)}
        onConfirm={() => {
          if (confirmRemove) onRemove(confirmRemove.id);
          setConfirmRemove(null);
        }}
      />
    </div>
  );
}
