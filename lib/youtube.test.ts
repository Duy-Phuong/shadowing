import { afterEach, describe, expect, test, vi } from "vitest";
import { extractVideoId, hasCaptions, normalizeCueTiming } from "./youtube";

describe("extractVideoId", () => {
  test("reads the v param from a standard watch URL", () => {
    expect(extractVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
  });

  test("reads a youtu.be short link", () => {
    expect(extractVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  test("ignores extra query params and timestamps", () => {
    expect(
      extractVideoId("https://youtu.be/dQw4w9WgXcQ?t=42"),
    ).toBe("dQw4w9WgXcQ");
    expect(
      extractVideoId("https://m.youtube.com/watch?v=dQw4w9WgXcQ&feature=share"),
    ).toBe("dQw4w9WgXcQ");
  });

  test("reads an embed URL", () => {
    expect(
      extractVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
  });

  test("accepts a bare 11-character video id", () => {
    expect(extractVideoId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  test("returns null for non-YouTube or unparseable input", () => {
    expect(extractVideoId("https://example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(extractVideoId("just some text")).toBeNull();
    expect(extractVideoId("")).toBeNull();
  });
});

describe("normalizeCueTiming", () => {
  test("converts millisecond timings (srv3 format) to seconds", () => {
    const result = normalizeCueTiming([
      { text: "one", offset: 0, duration: 2000 },
      { text: "two", offset: 2000, duration: 3500 },
    ]);

    expect(result).toEqual([
      { text: "one", start: 0, duration: 2 },
      { text: "two", start: 2, duration: 3.5 },
    ]);
  });

  test("leaves second timings (classic format) unchanged", () => {
    const result = normalizeCueTiming([
      { text: "one", offset: 0, duration: 2 },
      { text: "two", offset: 2, duration: 1.5 },
    ]);

    expect(result).toEqual([
      { text: "one", start: 0, duration: 2 },
      { text: "two", start: 2, duration: 1.5 },
    ]);
  });

  test("returns an empty array unchanged", () => {
    expect(normalizeCueTiming([])).toEqual([]);
  });
});

describe("hasCaptions", () => {
  afterEach(() => vi.unstubAllGlobals());

  const stubFetch = (impl: () => Promise<Response>) =>
    vi.stubGlobal("fetch", vi.fn(impl));

  test("returns true when the watch page advertises a caption track", async () => {
    stubFetch(async () =>
      new Response('...{"captionTracks":[{"baseUrl":"x"}]}...', { status: 200 }),
    );
    expect(await hasCaptions("dQw4w9WgXcQ")).toBe(true);
  });

  test("returns false when the watch page has no caption track", async () => {
    stubFetch(async () => new Response("<html>no tracks</html>", { status: 200 }));
    expect(await hasCaptions("dQw4w9WgXcQ")).toBe(false);
  });

  test("returns false when the fetch is not ok", async () => {
    stubFetch(async () => new Response("", { status: 404 }));
    expect(await hasCaptions("dQw4w9WgXcQ")).toBe(false);
  });

  test("returns false (never throws) when the fetch rejects", async () => {
    stubFetch(async () => {
      throw new Error("network down");
    });
    expect(await hasCaptions("dQw4w9WgXcQ")).toBe(false);
  });
});
