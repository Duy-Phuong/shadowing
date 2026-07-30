import { NextResponse } from "next/server";
import { FALLBACK_MODELS, pickFlashModels } from "@/lib/gemini";

export const runtime = "nodejs";

interface ModelEntry {
  name: string;
  supportedGenerationMethods?: string[];
}

/** Lists the account's usable Flash models for the lookup picker. */
export async function GET() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.trim() === "") {
    return NextResponse.json({ models: FALLBACK_MODELS });
  }
  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models",
      { headers: { "x-goog-api-key": key } },
    );
    if (!res.ok) return NextResponse.json({ models: FALLBACK_MODELS });
    const body = (await res.json()) as { models?: ModelEntry[] };
    const supported = (body.models ?? [])
      .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => m.name);
    const models = pickFlashModels(supported);
    // Make sure the reliable aliases are always offered, even if the live list
    // omits them, and keep them at the front.
    for (const alias of [...FALLBACK_MODELS].reverse()) {
      if (!models.includes(alias)) models.unshift(alias);
    }
    return NextResponse.json({ models: models.length ? models : FALLBACK_MODELS });
  } catch {
    return NextResponse.json({ models: FALLBACK_MODELS });
  }
}
