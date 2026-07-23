"use client";

import { compareWords, type WordResult } from "@/lib/compareWords";
import { maskText } from "@/lib/maskText";

interface Props {
  expected: string;
  typed: string;
  revealed: Set<number>;
  revealAll: boolean;
  onToggle: (index: number) => void;
}

/** Correct prefix letters shown, remaining letters as dots (punctuation kept). */
function partialDisplay(word: string, matched: number): string {
  let letterIndex = 0;
  let out = "";
  for (const ch of word) {
    if (/[\p{L}\p{N}]/u.test(ch)) {
      out += letterIndex < matched ? ch : "•";
      letterIndex++;
    } else {
      out += ch;
    }
  }
  return out;
}

function content(word: WordResult, shown: boolean): string {
  if (shown) return word.expected;
  switch (word.status) {
    case "correct":
      return word.expected;
    case "partial":
      return partialDisplay(word.expected, word.matchedChars);
    case "wrong":
      return word.typed;
    default:
      return maskText(word.expected);
  }
}

function colorClass(word: WordResult, shown: boolean): string {
  if (shown) return "text-neutral-600 dark:text-neutral-300";
  switch (word.status) {
    case "correct":
      return "text-green-600 dark:text-green-400";
    case "partial":
      return "text-amber-600 dark:text-amber-400";
    case "wrong":
      return "text-red-600 line-through dark:text-red-400";
    default:
      return "text-neutral-400";
  }
}

export default function DictationWords({
  expected,
  typed,
  revealed,
  revealAll,
  onToggle,
}: Props) {
  const words = compareWords(expected, typed);

  return (
    <div className="flex flex-wrap gap-2">
      {words.map((word, i) => {
        const shown = revealAll || revealed.has(i);
        return (
          <button
            key={i}
            onClick={() => onToggle(i)}
            title="Click to reveal"
            className={`rounded-md border border-neutral-200 px-3 py-2 font-mono text-sm tracking-wide transition hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600 ${colorClass(
              word,
              shown,
            )}`}
          >
            {content(word, shown)}
          </button>
        );
      })}
    </div>
  );
}
