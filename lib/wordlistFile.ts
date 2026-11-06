import { readFile } from "node:fs/promises";
import path from "node:path";
import { withFileLock, writeFileAtomic } from "./fileStore";
import { parseWordlist, serializeWordlist, type WordEntry } from "./wordlist";

const FILE = path.join(process.cwd(), "data", "wordlist.csv");

export async function readWordlist(): Promise<WordEntry[]> {
  try {
    return parseWordlist(await readFile(FILE, "utf8"));
  } catch {
    return [];
  }
}

/** Applies `change` to the stored wordlist under a lock and returns the result. */
export function updateWordlist(
  change: (entries: WordEntry[]) => WordEntry[],
): Promise<WordEntry[]> {
  return withFileLock(FILE, async () => {
    const next = change(await readWordlist());
    await writeFileAtomic(FILE, serializeWordlist(next));
    return next;
  });
}
