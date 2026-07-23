export type Level = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export interface PracticeVideo {
  videoId: string;
  title: string;
  channel: string;
  topic: string;
  level: Level;
}

/** A video shown in the Practice grid (level/topic optional for feed videos). */
export interface CatalogVideo {
  videoId: string;
  title: string;
  channel: string;
  topic?: string;
  level?: Level;
}

/** Channel feeds always aggregated into the catalogue, alongside user sources. */
export const DEFAULT_SOURCES: { channelId: string; name: string }[] = [
  { channelId: "UCxJGMJbjokfnr2-s4_RXPxQ", name: "Speak English With Vanessa" },
  { channelId: "UCZJJTxA36ZPNTJ1WFIByaeA", name: "Learn English with Bob the Canadian" },
  { channelId: "UCvn_XCl_mgQmt3sD753zdJA", name: "Rachel's English" },
  { channelId: "UCeTVoczn9NOZA9blls3YgUg", name: "Learn English with EnglishClass101" },
  { channelId: "UCNfm92h83W2i2ijc5Xwp_IA", name: "Pronunciation with Emma" },
  { channelId: "UCGLGVRO_9qDc8VDGGMTcUiQ", name: "Speak English With Tiffani" },
  { channelId: "UCKgpamMlm872zkGDcBJHYDg", name: "Learn English With TV Series" },
];

/**
 * Curated catalogue of videos verified to load with English captions.
 * Titles/levels/topics are editorial labels; the canonical title is fetched
 * from YouTube when a lesson is opened.
 */
export const PRACTICE_VIDEOS: PracticeVideo[] = [
  {
    videoId: "p-N3-Q8WyfU",
    title: "How Gen Z and TikTok are changing the way we speak",
    channel: "BBC World Service",
    topic: "Culture",
    level: "B2",
  },
  {
    videoId: "iG9CE55wbtY",
    title: "Do schools kill creativity? — Sir Ken Robinson",
    channel: "TED",
    topic: "Education",
    level: "B2",
  },
  {
    videoId: "arj7oStGLkU",
    title: "Inside the mind of a master procrastinator — Tim Urban",
    channel: "TED",
    topic: "Psychology",
    level: "B1",
  },
  {
    videoId: "H14bBuluwB8",
    title: "Grit: the power of passion and perseverance — Angela Lee Duckworth",
    channel: "TED",
    topic: "Psychology",
    level: "B2",
  },
  {
    videoId: "8jPQjjsBbIc",
    title: "How to stay calm when you know you'll be stressed — Daniel Levitin",
    channel: "TED",
    topic: "Psychology",
    level: "B2",
  },
  {
    videoId: "5MgBikgcWnY",
    title: "The first 20 hours — how to learn anything — Josh Kaufman",
    channel: "TEDx",
    topic: "Learning",
    level: "B1",
  },
  {
    videoId: "Ks-_Mh1QhMc",
    title: "Your body language may shape who you are — Amy Cuddy",
    channel: "TED",
    topic: "Psychology",
    level: "B2",
  },
];
