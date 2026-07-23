import { describe, expect, test } from "vitest";
import { parseSearchResults } from "./youtubeSearch";

// A trimmed-down copy of the shape YouTube embeds on its results page:
// window.ytInitialData holds a section list whose itemSectionRenderer contains
// videoRenderer entries (plus unrelated renderers we must ignore).
const html = `<!doctype html><html><body>
<script nonce="x">var ytInitialData = {"contents":{"twoColumnSearchResultsRenderer":{"primaryContents":{"sectionListRenderer":{"contents":[{"itemSectionRenderer":{"contents":[
{"videoRenderer":{"videoId":"dQw4w9WgXcQ","title":{"runs":[{"text":"Learn English Grammar"}]},"ownerText":{"runs":[{"text":"BBC Learning English"}]},"lengthText":{"simpleText":"12:04"}}},
{"videoRenderer":{"videoId":"abc123DEF45","title":{"runs":[{"text":"Coffee & Tea"}]},"longBylineText":{"runs":[{"text":"TED"}]},"lengthText":{"simpleText":"7:31"}}},
{"radioRenderer":{"playlistId":"RD123","title":{"simpleText":"Mix - ignore me"}}},
{"videoRenderer":{"videoId":"noDuration1","title":{"simpleText":"Live now"},"ownerText":{"runs":[{"text":"News Channel"}]}}}
]}}]}}}}};</script>
</body></html>`;

describe("parseSearchResults", () => {
  test("extracts video results from ytInitialData", () => {
    expect(parseSearchResults(html)).toEqual([
      {
        videoId: "dQw4w9WgXcQ",
        title: "Learn English Grammar",
        channel: "BBC Learning English",
        duration: "12:04",
        thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      },
      {
        videoId: "abc123DEF45",
        title: "Coffee & Tea",
        channel: "TED",
        duration: "7:31",
        thumbnail: "https://i.ytimg.com/vi/abc123DEF45/hqdefault.jpg",
      },
      {
        videoId: "noDuration1",
        title: "Live now",
        channel: "News Channel",
        duration: "",
        thumbnail: "https://i.ytimg.com/vi/noDuration1/hqdefault.jpg",
      },
    ]);
  });

  test("ignores non-video renderers (radio, shelves)", () => {
    const titles = parseSearchResults(html).map((r) => r.title);
    expect(titles).not.toContain("Mix - ignore me");
  });

  test("returns an empty array when ytInitialData is absent", () => {
    expect(parseSearchResults("<html>nothing here</html>")).toEqual([]);
  });

  test("returns an empty array when there are no videoRenderer entries", () => {
    const empty = `<script>var ytInitialData = {"contents":{}};</script>`;
    expect(parseSearchResults(empty)).toEqual([]);
  });
});
