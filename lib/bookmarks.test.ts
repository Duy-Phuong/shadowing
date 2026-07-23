import { describe, expect, test } from "vitest";
import {
  addBookmark,
  parseBookmarks,
  removeBookmark,
  serializeBookmarks,
  type Bookmark,
} from "./bookmarks";

const a: Bookmark = { videoId: "aaa", title: "A", url: "http://x/a" };
const b: Bookmark = { videoId: "bbb", title: "B", url: "http://x/b" };

describe("parseBookmarks", () => {
  test("parses one JSON object per line, skipping blanks and junk", () => {
    const text = `${JSON.stringify(a)}\n\n${JSON.stringify(b)}\nnot json`;
    expect(parseBookmarks(text)).toEqual([a, b]);
  });

  test("returns an empty array for empty text", () => {
    expect(parseBookmarks("")).toEqual([]);
  });
});

describe("serializeBookmarks", () => {
  test("round-trips through parse", () => {
    expect(parseBookmarks(serializeBookmarks([a, b]))).toEqual([a, b]);
  });
});

describe("addBookmark", () => {
  test("appends a new bookmark", () => {
    expect(addBookmark([a], b)).toEqual([a, b]);
  });

  test("does not duplicate an existing videoId", () => {
    const updated = { ...a, title: "A2" };
    expect(addBookmark([a], updated)).toEqual([a]);
  });
});

describe("removeBookmark", () => {
  test("removes by videoId", () => {
    expect(removeBookmark([a, b], "aaa")).toEqual([b]);
  });

  test("is a no-op when the id is absent", () => {
    expect(removeBookmark([a], "zzz")).toEqual([a]);
  });
});
