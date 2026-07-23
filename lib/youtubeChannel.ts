const CHANNEL_ID = /UC[A-Za-z0-9_-]{22}/;

/** Extracts a channel id (UC…) from a YouTube channel page's HTML. */
export function parseChannelId(html: string): string | null {
  const patterns = [
    /"externalId":"(UC[A-Za-z0-9_-]{22})"/,
    /youtube\.com\/channel\/(UC[A-Za-z0-9_-]{22})/,
    /"channelId":"(UC[A-Za-z0-9_-]{22})"/,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1];
  }
  const loose = html.match(CHANNEL_ID);
  return loose ? loose[0] : null;
}

/** Extracts the channel's display name from its page's og:title meta tag. */
export function parseChannelName(html: string): string | null {
  const m = html.match(/<meta property="og:title" content="([^"]*)"/);
  return m ? m[1] : null;
}

export interface FeedVideo {
  videoId: string;
  title: string;
}

const decodeEntities = (s: string): string =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

/** Parses a YouTube channel RSS feed into a list of {videoId, title}. */
export function parseYouTubeFeed(xml: string): FeedVideo[] {
  const videos: FeedVideo[] = [];
  const entries = xml.split("<entry>").slice(1);
  for (const entry of entries) {
    const id = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const title = entry.match(/<title>([^<]*)<\/title>/);
    if (id && title) {
      videos.push({
        videoId: id[1].trim(),
        title: decodeEntities(title[1].trim()),
      });
    }
  }
  return videos;
}
