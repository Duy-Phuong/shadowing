import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseSources, serializeSources, type Source } from "./sources";

const FILE = path.join(process.cwd(), "data", "sources.txt");

export async function readSources(): Promise<Source[]> {
  try {
    return parseSources(await readFile(FILE, "utf8"));
  } catch {
    return [];
  }
}

export async function writeSources(sources: Source[]): Promise<void> {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, serializeSources(sources), "utf8");
}
