import { NextResponse } from "next/server";
import type { VocabRow } from "@/lib/vocabulary";
import {
  normalizeRow,
  readVocabulary,
  writeVocabulary,
} from "@/lib/vocabularyFile";

export async function GET() {
  return NextResponse.json(await readVocabulary());
}

export async function PUT(request: Request) {
  let body: { rows?: unknown };
  try {
    body = (await request.json()) as { rows?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (!Array.isArray(body.rows)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const rows = (body.rows as Partial<VocabRow>[]).map(normalizeRow);
  await writeVocabulary(rows);
  return NextResponse.json(rows);
}
