import { readFile } from "node:fs/promises";
import path from "node:path";
import { withFileLock, writeFileAtomic } from "./fileStore";
import type { VocabRow } from "./vocabulary";

const FILE = path.join(process.cwd(), "data", "vocabulary.json");

/** Coerces arbitrary input into a well-formed VocabRow (all string fields). */
export function normalizeRow(input: Partial<VocabRow>): VocabRow {
  const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
  return {
    id: s(input.id),
    name: s(input.name),
    ipa: s(input.ipa),
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

export function writeVocabulary(rows: VocabRow[]): Promise<void> {
  return withFileLock(FILE, () =>
    writeFileAtomic(FILE, JSON.stringify(rows, null, 2)),
  );
}
