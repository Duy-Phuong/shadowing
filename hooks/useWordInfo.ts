"use client";

import { useEffect, useState } from "react";
import type { WordInfo } from "@/lib/dictionary";

// Module-level cache so word lookups persist across sentence navigation
// (the words component remounts per sentence).
const cache = new Map<string, WordInfo>();

/**
 * Fetches and caches dictionary info (IPA + definitions) for the given words
 * from /api/define. Returns the shared cache; missing words resolve lazily.
 */
export function useWordInfo(words: string[]): Map<string, WordInfo> {
  const key = words.join(",");
  const [, setVersion] = useState(0);

  useEffect(() => {
    const list = key ? key.split(",") : [];
    const missing = list.filter((w) => w && !cache.has(w));
    if (missing.length === 0) return;

    let cancelled = false;
    fetch("/api/define", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ words: missing }),
    })
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: Record<string, WordInfo>) => {
        if (cancelled) return;
        for (const [word, info] of Object.entries(data)) cache.set(word, info);
        setVersion((n) => n + 1);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [key]);

  return cache;
}
