import { NextResponse } from "next/server";
import {
  addWord,
  removeWord,
  updateWord,
  type WordEntry,
} from "@/lib/wordlist";
import { readWordlist, updateWordlist } from "@/lib/wordlistFile";

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
  const entry: WordEntry = {
    word: body.word,
    ipa: body.ipa ?? null,
    definition: body.definition ?? "",
    partOfSpeech: body.partOfSpeech ?? null,
    unit: body.unit ?? 1,
  };
  const updated = await updateWordlist((list) => addWord(list, entry));
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
  const { word, unit } = body;
  const updated = await updateWordlist((list) =>
    updateWord(list, word, { unit: unit ?? null }),
  );
  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const word = new URL(request.url).searchParams.get("word");
  if (!word) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const updated = await updateWordlist((list) => removeWord(list, word));
  return NextResponse.json(updated);
}
