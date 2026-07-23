import { NextResponse } from "next/server";
import { parseChannelId, parseChannelName } from "@/lib/youtubeChannel";
import { addSource, removeSource, type Source } from "@/lib/sources";
import { readSources, writeSources } from "@/lib/sourcesFile";

async function resolveChannel(
  rawUrl: string,
): Promise<{ channelId: string; name: string } | null> {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
  } catch {
    return null;
  }
  if (!url.hostname.replace(/^www\./, "").endsWith("youtube.com")) return null;

  try {
    const res = await fetch(url.toString(), {
      headers: { "Accept-Language": "en-US" },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const channelId = parseChannelId(html);
    if (!channelId) return null;
    return { channelId, name: parseChannelName(html) ?? channelId };
  } catch {
    return null;
  }
}

export async function GET() {
  return NextResponse.json(await readSources());
}

export async function POST(request: Request) {
  let body: { url?: string };
  try {
    body = (await request.json()) as { url?: string };
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (!body.url || typeof body.url !== "string") {
    return NextResponse.json(
      { error: "invalid_request", message: "A channel URL is required." },
      { status: 400 },
    );
  }

  const resolved = await resolveChannel(body.url);
  if (!resolved) {
    return NextResponse.json(
      {
        error: "resolve_failed",
        message: "Couldn't find that YouTube channel. Paste a channel URL.",
      },
      { status: 422 },
    );
  }

  const source: Source = { ...resolved, url: body.url };
  const updated = addSource(await readSources(), source);
  await writeSources(updated);
  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const channelId = new URL(request.url).searchParams.get("channelId");
  if (!channelId) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const updated = removeSource(await readSources(), channelId);
  await writeSources(updated);
  return NextResponse.json(updated);
}
