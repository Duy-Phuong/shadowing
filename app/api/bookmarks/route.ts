import { NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  addBookmark,
  parseBookmarks,
  removeBookmark,
  serializeBookmarks,
  type Bookmark,
} from "@/lib/bookmarks";

const FILE = path.join(process.cwd(), "data", "bookmarks.txt");

async function readAll(): Promise<Bookmark[]> {
  try {
    return parseBookmarks(await readFile(FILE, "utf8"));
  } catch {
    return []; // file doesn't exist yet
  }
}

async function writeAll(bookmarks: Bookmark[]): Promise<void> {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, serializeBookmarks(bookmarks), "utf8");
}

export async function GET() {
  return NextResponse.json(await readAll());
}

export async function POST(request: Request) {
  let body: Partial<Bookmark>;
  try {
    body = (await request.json()) as Partial<Bookmark>;
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (!body.videoId || !body.title || !body.url) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const updated = addBookmark(await readAll(), {
    videoId: body.videoId,
    title: body.title,
    url: body.url,
  });
  await writeAll(updated);
  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const videoId = new URL(request.url).searchParams.get("videoId");
  if (!videoId) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const updated = removeBookmark(await readAll(), videoId);
  await writeAll(updated);
  return NextResponse.json(updated);
}
