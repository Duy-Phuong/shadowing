import { NextResponse } from "next/server";
import { parseYouTubeFeed } from "@/lib/youtubeChannel";
import {
  DEFAULT_SOURCES,
  PRACTICE_VIDEOS,
  type CatalogVideo,
} from "@/lib/practiceVideos";
import { readSources } from "@/lib/sourcesFile";

const FEED = "https://www.youtube.com/feeds/videos.xml?channel_id=";
const TTL_MS = 10 * 60 * 1000;

const cache = new Map<string, { ts: number; items: CatalogVideo[] }>();

async function fetchFeed(channelId: string, name: string): Promise<CatalogVideo[]> {
  const cached = cache.get(channelId);
  if (cached && Date.now() - cached.ts < TTL_MS) return cached.items;
  try {
    const res = await fetch(`${FEED}${channelId}`);
    if (!res.ok) return cached?.items ?? [];
    const items: CatalogVideo[] = parseYouTubeFeed(await res.text()).map((v) => ({
      videoId: v.videoId,
      title: v.title,
      channel: name,
      topic: name,
    }));
    cache.set(channelId, { ts: Date.now(), items });
    return items;
  } catch {
    return cached?.items ?? [];
  }
}

export async function GET() {
  const userSources = await readSources();
  const sources = [
    ...DEFAULT_SOURCES,
    ...userSources.map((s) => ({ channelId: s.channelId, name: s.name })),
  ];
  // Dedupe channels (a user may re-add a default).
  const uniqueChannels = [
    ...new Map(sources.map((s) => [s.channelId, s])).values(),
  ];

  const feeds = await Promise.all(
    uniqueChannels.map((s) => fetchFeed(s.channelId, s.name)),
  );

  const curated: CatalogVideo[] = PRACTICE_VIDEOS.map((v) => ({
    videoId: v.videoId,
    title: v.title,
    channel: v.channel,
    topic: v.topic,
    level: v.level,
  }));

  // Combine, deduping by videoId (curated entries win, keeping level/topic).
  const byId = new Map<string, CatalogVideo>();
  for (const v of [...curated, ...feeds.flat()]) {
    if (!byId.has(v.videoId)) byId.set(v.videoId, v);
  }

  return NextResponse.json([...byId.values()]);
}
