export interface Bookmark {
  videoId: string;
  title: string;
  url: string;
}

/** Parses newline-delimited JSON bookmarks, skipping blank/malformed lines. */
export function parseBookmarks(text: string): Bookmark[] {
  const result: Bookmark[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "") continue;
    try {
      const obj = JSON.parse(trimmed) as Bookmark;
      if (obj && typeof obj.videoId === "string") result.push(obj);
    } catch {
      // skip malformed line
    }
  }
  return result;
}

/** Serializes bookmarks to one JSON object per line. */
export function serializeBookmarks(bookmarks: Bookmark[]): string {
  return bookmarks.map((b) => JSON.stringify(b)).join("\n");
}

/** Adds a bookmark unless one with the same videoId already exists. */
export function addBookmark(bookmarks: Bookmark[], bookmark: Bookmark): Bookmark[] {
  if (bookmarks.some((b) => b.videoId === bookmark.videoId)) return bookmarks;
  return [...bookmarks, bookmark];
}

/** Removes the bookmark with the given videoId. */
export function removeBookmark(bookmarks: Bookmark[], videoId: string): Bookmark[] {
  return bookmarks.filter((b) => b.videoId !== videoId);
}
