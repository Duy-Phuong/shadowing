import { describe, expect, test } from "vitest";
import {
  isYouTubeUrl,
  parseChannelId,
  parseChannelName,
  parseYouTubeFeed,
} from "./youtubeChannel";

describe("isYouTubeUrl", () => {
  test("accepts youtube.com and its subdomains", () => {
    for (const u of [
      "https://www.youtube.com/@bbclearningenglish",
      "https://youtube.com/channel/UC1234567890123456789012",
      "https://m.youtube.com/@ted",
      "http://www.youtube.com/c/ted",
    ]) {
      expect(isYouTubeUrl(new URL(u))).toBe(true);
    }
  });

  test("rejects look-alike hosts, other schemes and ports", () => {
    for (const u of [
      "https://evilyoutube.com/@x",
      "https://youtube.com.evil.example/@x",
      "https://www.youtube.com:8080/@x",
      "https://user:pw@www.youtube.com/@x",
      "ftp://www.youtube.com/@x",
      "http://127.0.0.1/@x",
    ]) {
      expect(isYouTubeUrl(new URL(u))).toBe(false);
    }
  });
});

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
