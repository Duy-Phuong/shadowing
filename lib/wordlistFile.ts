import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseWordlist, serializeWordlist, type WordEntry } from "./wordlist";

const FILE = path.join(process.cwd(), "data", "wordlist.csv");

export async function readWordlist(): Promise<WordEntry[]> {
  try {
    return parseWordlist(await readFile(FILE, "utf8"));
  } catch {
    return [];
  }
}

export async function writeWordlist(entries: WordEntry[]): Promise<void> {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, serializeWordlist(entries), "utf8");
}
