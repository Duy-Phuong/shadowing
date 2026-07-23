"use client";

import { useState } from "react";
import { diffWords, type DiffToken } from "@/lib/diffWords";
import type { Sentence } from "@/lib/types";
import DictationWords from "./DictationWords";

interface Props {
  sentence: Sentence;
}

const TOKEN_STYLES: Record<DiffToken["type"], string> = {
  correct: "text-green-600 dark:text-green-400",
  wrong: "text-red-600 line-through dark:text-red-400",
  missing:
    "text-amber-600 underline decoration-dotted dark:text-amber-400",
  extra: "text-neutral-400 line-through",
};

export default function DictationPanel({ sentence }: Props) {
  const [typed, setTyped] = useState("");
  const [diff, setDiff] = useState<DiffToken[] | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [revealedWords, setRevealedWords] = useState<Set<number>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const toggleWord = (index: number) => {
    setRevealedWords((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
        Listen, then type what you hear
      </span>

      <textarea
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && typed.trim() !== "") {
            e.preventDefault();
            setDiff(diffWords(sentence.text, typed));
          }
        }}
        rows={3}
        placeholder="Type here… (Enter to check, Shift+Enter for a new line)"
        className="w-full resize-none rounded-lg border border-neutral-300 px-4 py-3 text-lg outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-300"
      />

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-400">
            Live result — click a word to reveal it
          </span>
          <button
            onClick={() => setShowAll((v) => !v)}
            className="font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          >
            {showAll ? "Hide all" : "Show all"}
          </button>
        </div>
        <DictationWords
          expected={sentence.text}
          typed={typed}
          revealed={revealedWords}
          revealAll={showAll}
          onToggle={toggleWord}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setDiff(diffWords(sentence.text, typed))}
          disabled={typed.trim() === ""}
          className="rounded-lg bg-neutral-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-40 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Check
        </button>
        <button
          onClick={() => setRevealed((v) => !v)}
          className="rounded-lg border border-neutral-200 px-5 py-2 text-sm font-medium transition hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-800"
        >
          {revealed ? "Hide answer" : "Reveal answer"}
        </button>
      </div>

      {diff && (
        <p className="flex flex-wrap gap-x-2 gap-y-1 text-lg leading-relaxed">
          {diff.map((t, i) => (
            <span key={i} className={TOKEN_STYLES[t.type]}>
              {t.type === "missing" ? t.expected : (t.typed ?? t.expected)}
            </span>
          ))}
        </p>
      )}

      {revealed && (
        <p className="rounded-lg bg-neutral-100 px-4 py-3 text-lg dark:bg-neutral-800">
          {sentence.text}
        </p>
      )}
    </div>
  );
}
