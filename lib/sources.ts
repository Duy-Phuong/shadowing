export interface Source {
  channelId: string;
  name: string;
  url: string;
}

export function parseSources(text: string): Source[] {
  const result: Source[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "") continue;
    try {
      const obj = JSON.parse(trimmed) as Source;
      if (obj && typeof obj.channelId === "string") result.push(obj);
    } catch {
      // skip malformed line
    }
  }
  return result;
}

export function serializeSources(sources: Source[]): string {
  return sources.map((s) => JSON.stringify(s)).join("\n");
}

export function addSource(sources: Source[], source: Source): Source[] {
  if (sources.some((s) => s.channelId === source.channelId)) return sources;
  return [...sources, source];
}

export function removeSource(sources: Source[], channelId: string): Source[] {
  return sources.filter((s) => s.channelId !== channelId);
}
