"use client";

import { useState } from "react";
import type { Bookmark } from "@/lib/bookmarks";
import ConfirmDialog from "./ConfirmDialog";

interface Props {
  bookmarks: Bookmark[];
  loading: boolean;
  onOpen: (bookmark: Bookmark) => void;
  onRemove: (videoId: string) => void;
}

export default function MyVideos({
  bookmarks,
  loading,
  onOpen,
  onRemove,
}: Props) {
  const [confirmRemove, setConfirmRemove] = useState<Bookmark | null>(null);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">My Videos</h1>

      {loading ? (
        <p className="text-neutral-400">Loading…</p>
      ) : bookmarks.length === 0 ? (
        <p className="text-neutral-400">
          No saved videos yet. Open a video and tap the ★ next to its title to
          save it here.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {bookmarks.map((b) => (
            <li
              key={b.videoId}
              className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <button
                onClick={() => onOpen(b)}
                className="flex gap-3 text-left"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- external YouTube thumbnail, no optimization needed */}
                <img
                  src={`https://i.ytimg.com/vi/${b.videoId}/mqdefault.jpg`}
                  alt=""
                  className="h-16 w-28 shrink-0 rounded-md object-cover"
                />
                <span className="line-clamp-3 text-sm font-medium">
                  {b.title}
                </span>
              </button>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => onOpen(b)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-900 hover:underline dark:text-white"
                >
                  Open
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
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => setConfirmRemove(b)}
                  aria-label="Remove from My Videos"
                  title="Remove from My Videos"
                  className="text-neutral-400 hover:text-red-500"
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
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={confirmRemove !== null}
        title="Remove video?"
        message={
          confirmRemove
            ? `Remove “${confirmRemove.title}” from My Videos?`
            : ""
        }
        onCancel={() => setConfirmRemove(null)}
        onConfirm={() => {
          if (confirmRemove) onRemove(confirmRemove.videoId);
          setConfirmRemove(null);
        }}
      />
    </div>
  );
}
