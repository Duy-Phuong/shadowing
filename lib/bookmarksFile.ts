import { readFile } from "node:fs/promises";
import path from "node:path";
import { withFileLock, writeFileAtomic } from "./fileStore";
import { parseBookmarks, serializeBookmarks, type Bookmark } from "./bookmarks";

const FILE = path.join(process.cwd(), "data", "bookmarks.txt");

export async function readBookmarks(): Promise<Bookmark[]> {
  try {
    return parseBookmarks(await readFile(FILE, "utf8"));
  } catch {
    return []; // file doesn't exist yet
  }
}

/** Applies `change` to the stored bookmarks under a lock and returns the result. */
export function updateBookmarks(
  change: (list: Bookmark[]) => Bookmark[],
): Promise<Bookmark[]> {
  return withFileLock(FILE, async () => {
    const next = change(await readBookmarks());
    await writeFileAtomic(FILE, serializeBookmarks(next));
    return next;
  });
}
