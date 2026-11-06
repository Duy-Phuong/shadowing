import { readFile } from "node:fs/promises";
import path from "node:path";
import { withFileLock, writeFileAtomic } from "./fileStore";
import { parseSources, serializeSources, type Source } from "./sources";

const FILE = path.join(process.cwd(), "data", "sources.txt");

export async function readSources(): Promise<Source[]> {
  try {
    return parseSources(await readFile(FILE, "utf8"));
  } catch {
    return [];
  }
}

/** Applies `change` to the stored sources under a lock and returns the result. */
export function updateSources(
  change: (sources: Source[]) => Source[],
): Promise<Source[]> {
  return withFileLock(FILE, async () => {
    const next = change(await readSources());
    await writeFileAtomic(FILE, serializeSources(next));
    return next;
  });
}
