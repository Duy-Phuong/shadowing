export interface SearchResult {
  videoId: string;
  title: string;
  channel: string;
  duration: string; // e.g. "12:04" as shown by YouTube; "" when absent (live)
  thumbnail: string;
}

/** Returns the JSON string of the object literal assigned to `ytInitialData`. */
function extractInitialData(html: string): string | null {
  const marker = html.indexOf("ytInitialData");
  if (marker === -1) return null;
  const start = html.indexOf("{", marker);
  if (start === -1) return null;

  // Scan for the matching closing brace, respecting strings and escapes so a
  // "}" inside a title doesn't end the object early.
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
    } else if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) return html.slice(start, i + 1);
    }
  }
  return null;
}

interface Runs {
  runs?: { text?: string }[];
  simpleText?: string;
}

function readText(node: Runs | undefined): string {
  if (!node) return "";
  if (node.runs?.[0]?.text) return node.runs[0].text;
  return node.simpleText ?? "";
}

interface VideoRenderer {
  videoId?: string;
  title?: Runs;
  ownerText?: Runs;
  longBylineText?: Runs;
  lengthText?: Runs;
}

/** Recursively collects every `videoRenderer` object nested in the data. */
function collectVideoRenderers(node: unknown, out: VideoRenderer[]): void {
  if (Array.isArray(node)) {
    for (const item of node) collectVideoRenderers(item, out);
    return;
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (obj.videoRenderer) out.push(obj.videoRenderer as VideoRenderer);
    for (const value of Object.values(obj)) collectVideoRenderers(value, out);
  }
}

/**
 * Parses the YouTube search results page HTML into a list of video results.
 * Reads the embedded `ytInitialData` JSON and walks it for `videoRenderer`
 * entries, ignoring playlists, channels, shelves and other renderers.
 */
export function parseSearchResults(html: string): SearchResult[] {
  const json = extractInitialData(html);
  if (!json) return [];

  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return [];
  }

  const renderers: VideoRenderer[] = [];
  collectVideoRenderers(data, renderers);

  const results: SearchResult[] = [];
  const seen = new Set<string>();
  for (const r of renderers) {
    const videoId = r.videoId;
    if (!videoId || seen.has(videoId)) continue;
    const title = readText(r.title);
    if (!title) continue;
    seen.add(videoId);
    results.push({
      videoId,
      title,
      channel: readText(r.ownerText) || readText(r.longBylineText),
      duration: readText(r.lengthText),
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    });
  }
  return results;
}
