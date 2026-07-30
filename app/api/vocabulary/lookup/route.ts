import { NextResponse } from "next/server";
import { GeminiNotConfiguredError, lookupWord } from "@/lib/gemini";

export const runtime = "nodejs";

/** Looks up a word via Gemini and returns { word, ipa, type, examples }. */
export async function POST(request: Request) {
  let body: { word?: unknown; model?: unknown };
  try {
    body = (await request.json()) as { word?: unknown; model?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const word = typeof body.word === "string" ? body.word.trim() : "";
  const model = typeof body.model === "string" ? body.model.trim() : "";
  if (word === "") {
    return NextResponse.json(
      { error: "invalid_request", message: "A word is required." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await lookupWord(word, model || undefined));
  } catch (err) {
    if (err instanceof GeminiNotConfiguredError) {
      return NextResponse.json(
        {
          error: "not_configured",
          message: "Gemini API key is not set. Add GEMINI_API_KEY to .env.local.",
        },
        { status: 503 },
      );
    }
    console.error("[vocabulary/lookup]", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "lookup_failed", message: "Couldn't look that word up.", detail },
      { status: 502 },
    );
  }
}
