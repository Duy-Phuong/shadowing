import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { withFileLock, writeFileAtomic } from "@/lib/fileStore";
import {
  addSentence,
  parseSentences,
  removeSentence,
  serializeSentences,
  type SavedSentence,
} from "@/lib/sentences";

const FILE = path.join(process.cwd(), "data", "sentences.txt");

async function readAll(): Promise<SavedSentence[]> {
  try {
    return parseSentences(await readFile(FILE, "utf8"));
  } catch {
    return []; // file doesn't exist yet
  }
}

/** Applies `change` to the stored list under a lock and returns the result. */
function update(change: (list: SavedSentence[]) => SavedSentence[]): Promise<SavedSentence[]> {
  return withFileLock(FILE, async () => {
    const next = change(await readAll());
    await writeFileAtomic(FILE, serializeSentences(next));
    return next;
  });
}

export async function GET() {
  return NextResponse.json(await readAll());
}

export async function POST(request: Request) {
  let body: Partial<SavedSentence>;
  try {
    body = (await request.json()) as Partial<SavedSentence>;
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (!body.id || !body.videoId || !body.text) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const entry: SavedSentence = {
    id: body.id,
    videoId: body.videoId,
    title: body.title ?? "",
    text: body.text,
    start: typeof body.start === "number" ? body.start : 0,
    sentenceId: typeof body.sentenceId === "number" ? body.sentenceId : 0,
  };
  const updated = await update((list) => addSentence(list, entry));
  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const updated = await update((list) => removeSentence(list, id));
  return NextResponse.json(updated);
}
