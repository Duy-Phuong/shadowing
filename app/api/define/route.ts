import { NextResponse } from "next/server";
import { dictionary as cmuDictionary } from "cmu-pronouncing-dictionary";
import { normalizeDictionaryEntry, type WordInfo } from "@/lib/dictionary";
import { arpabetToIpa } from "@/lib/arpabetToIpa";

const API = "https://api.dictionaryapi.dev/api/v2/entries/en";
const MAX_WORDS = 40;

const cmu = cmuDictionary as Record<string, string>;

/** IPA from the CMU dictionary (broad coverage), wrapped in slashes. */
function cmuIpa(word: string): string | null {
  const arpabet = cmu[word];
  if (!arpabet) return null;
  const ipa = arpabetToIpa(arpabet);
  return ipa ? `/${ipa}/` : null;
}

async function lookup(word: string): Promise<WordInfo> {
  let fromApi: WordInfo = { word, ipa: null, meanings: [] };
  try {
    const res = await fetch(`${API}/${encodeURIComponent(word)}`);
    if (res.ok) fromApi = normalizeDictionaryEntry(await res.json(), word);
  } catch {
    // ignore — CMU IPA and/or empty meanings still returned below
  }
  // Prefer CMU IPA (much broader coverage) over the dictionary API's.
  return { ...fromApi, ipa: cmuIpa(word) ?? fromApi.ipa };
}

export async function POST(request: Request) {
  let body: { words?: unknown };
  try {
    body = (await request.json()) as { words?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (!Array.isArray(body.words)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const words = Array.from(
    new Set(
      body.words
        .filter((w): w is string => typeof w === "string")
        .map((w) => w.toLowerCase())
        .filter((w) => w !== ""),
    ),
  ).slice(0, MAX_WORDS);

  const entries = await Promise.all(
    words.map(async (w) => [w, await lookup(w)] as const),
  );

  return NextResponse.json(Object.fromEntries(entries));
}
