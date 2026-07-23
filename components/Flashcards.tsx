"use client";

import { useState } from "react";
import { speakWord } from "@/lib/speak";
import type { WordEntry } from "@/lib/wordlist";

function shuffle<T>(list: T[]): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function Flashcards({
  entries,
  onExit,
}: {
  entries: WordEntry[];
  onExit: () => void;
}) {
  const [order, setOrder] = useState(() => shuffle(entries));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = order[index];

  const go = (delta: number) => {
    setIndex((i) => (i + delta + order.length) % order.length);
    setFlipped(false);
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-4 py-8">
      <div className="flex w-full items-center justify-between">
        <button
          onClick={onExit}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
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
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to wordlist
        </button>
        <span className="text-sm tabular-nums text-neutral-400">
          {index + 1} / {order.length}
        </span>
      </div>

      <button
        onClick={() => setFlipped((f) => !f)}
        className="flex min-h-56 w-full flex-col items-center justify-center gap-3 rounded-2xl border border-neutral-200 p-8 text-center transition hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-500"
      >
        {!flipped ? (
          <>
            <span className="text-3xl font-semibold">{card.word}</span>
            <span className="text-xs text-neutral-400">Tap to reveal</span>
          </>
        ) : (
          <>
            {card.ipa && (
              <span className="text-lg text-neutral-500">{card.ipa}</span>
            )}
            <span className="text-lg">
              {card.definition || "No definition saved."}
            </span>
          </>
        )}
      </button>

      <div className="flex items-center gap-3">
        <button
          onClick={() => go(-1)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium transition hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-800"
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
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Prev
        </button>
        <button
          onClick={() => speakWord(card.word)}
          aria-label="Pronounce"
          className="rounded-lg border border-neutral-200 px-4 py-2 text-lg dark:border-neutral-800"
        >
          🔊
        </button>
        <button
          onClick={() => {
            setOrder(shuffle(entries));
            setIndex(0);
            setFlipped(false);
          }}
          className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium transition hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-800"
        >
          Shuffle
        </button>
        <button
          onClick={() => go(1)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900"
        >
          Next
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
      </div>
    </div>
  );
}
