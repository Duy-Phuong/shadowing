import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { VocabRow } from "./vocabulary";

const FILE = path.join(process.cwd(), "data", "vocabulary.json");

/** Coerces arbitrary input into a well-formed VocabRow (all string fields). */
export function normalizeRow(input: Partial<VocabRow>): VocabRow {
  const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
  return {
    id: s(input.id),
    name: s(input.name),
    type: s(input.type),
    description: s(input.description),
    unit: s(input.unit),
  };
}

export async function readVocabulary(): Promise<VocabRow[]> {
  try {
    const data = JSON.parse(await readFile(FILE, "utf8"));
    return Array.isArray(data) ? data.map(normalizeRow) : [];
  } catch {
    return [];
  }
}

export async function writeVocabulary(rows: VocabRow[]): Promise<void> {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(rows, null, 2), "utf8");
}
