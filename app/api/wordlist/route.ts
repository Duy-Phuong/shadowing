import { NextResponse } from "next/server";
import {
  addWord,
  removeWord,
  updateWord,
  type WordEntry,
} from "@/lib/wordlist";
import { readWordlist, writeWordlist } from "@/lib/wordlistFile";

export async function GET() {
  return NextResponse.json(await readWordlist());
}

export async function POST(request: Request) {
  let body: Partial<WordEntry>;
  try {
    body = (await request.json()) as Partial<WordEntry>;
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (!body.word) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const updated = addWord(await readWordlist(), {
    word: body.word,
    ipa: body.ipa ?? null,
    definition: body.definition ?? "",
    partOfSpeech: body.partOfSpeech ?? null,
    unit: body.unit ?? 1,
  });
  await writeWordlist(updated);
  return NextResponse.json(updated);
}

export async function PATCH(request: Request) {
  let body: { word?: string; unit?: number | null };
  try {
    body = (await request.json()) as { word?: string; unit?: number | null };
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (!body.word) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const updated = updateWord(await readWordlist(), body.word, {
    unit: body.unit ?? null,
  });
  await writeWordlist(updated);
  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const word = new URL(request.url).searchParams.get("word");
  if (!word) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const updated = removeWord(await readWordlist(), word);
  await writeWordlist(updated);
  return NextResponse.json(updated);
}
