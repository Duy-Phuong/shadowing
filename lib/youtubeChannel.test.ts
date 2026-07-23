import { describe, expect, test } from "vitest";
import {
  parseChannelId,
  parseChannelName,
  parseYouTubeFeed,
} from "./youtubeChannel";

describe("parseChannelName", () => {
  test("reads the og:title meta tag", () => {
    const html =
      '<meta property="og:title" content="Speak English With Vanessa">';
    expect(parseChannelName(html)).toBe("Speak English With Vanessa");
  });

  test("returns null when absent", () => {
    expect(parseChannelName("<html></html>")).toBeNull();
  });
});

describe("parseChannelId", () => {
  test("reads externalId", () => {
    const html = 'foo "externalId":"UCxJGMJbjokfnr2-s4_RXPxQ" bar';
    expect(parseChannelId(html)).toBe("UCxJGMJbjokfnr2-s4_RXPxQ");
  });

  test("falls back to a canonical /channel/ URL", () => {
    const html =
      '<link rel="canonical" href="https://www.youtube.com/channel/UCD9GncxJtf-LMH-MIsrjmBg">';
    expect(parseChannelId(html)).toBe("UCD9GncxJtf-LMH-MIsrjmBg");
  });

  test("returns null when no channel id is present", () => {
    expect(parseChannelId("<html>nothing here</html>")).toBeNull();
  });
});

describe("parseYouTubeFeed", () => {
  const xml = `<?xml version="1.0"?>
  <feed>
    <title>Channel Name</title>
    <entry>
      <yt:videoId>abc123DEF45</yt:videoId>
      <title>Order Coffee &amp; Tea</title>
    </entry>
    <entry>
      <yt:videoId>xyz987WVU65</yt:videoId>
      <title>Second Video</title>
    </entry>
  </feed>`;

  test("extracts videoId and title per entry", () => {
    expect(parseYouTubeFeed(xml)).toEqual([
      { videoId: "abc123DEF45", title: "Order Coffee & Tea" },
      { videoId: "xyz987WVU65", title: "Second Video" },
    ]);
  });

  test("ignores the feed-level title (only entries)", () => {
    expect(parseYouTubeFeed(xml)).toHaveLength(2);
  });

  test("returns an empty array for a feed with no entries", () => {
    expect(parseYouTubeFeed("<feed><title>x</title></feed>")).toEqual([]);
  });
});
