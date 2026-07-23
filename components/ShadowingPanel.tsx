"use client";

import { useState } from "react";
import type { Sentence } from "@/lib/types";
import ShadowingWords, { type SaveWordEntry } from "./ShadowingWords";
import ShadowingSpeak from "./ShadowingSpeak";

interface Props {
  sentence: Sentence;
  savedWords: Set<string>;
  onToggleWord: (entry: SaveWordEntry) => void;
}

export default function ShadowingPanel({
  sentence,
  savedWords,
  onToggleWord,
}: Props) {
  const [showIpa, setShowIpa] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
          Listen and repeat — tap a word for pronunciation
        </span>
        <button
          onClick={() => setShowIpa((v) => !v)}
          aria-pressed={showIpa}
          className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition ${
            showIpa
              ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
              : "border-neutral-200 text-neutral-500 hover:text-neutral-900 dark:border-neutral-800 dark:hover:text-white"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
            aria-hidden="true"
          >
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
            {!showIpa && <line x1="3" y1="3" x2="21" y2="21" />}
          </svg>
          IPA
        </button>
      </div>
      <ShadowingWords
        key={sentence.id}
        text={sentence.text}
        showIpa={showIpa}
        savedWords={savedWords}
        onToggleWord={onToggleWord}
      />
      <div className="mt-1 border-t border-neutral-100 pt-3 dark:border-neutral-800">
        <ShadowingSpeak key={sentence.id} expected={sentence.text} />
      </div>
    </div>
  );
}
