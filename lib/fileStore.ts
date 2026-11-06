import { mkdir, rename, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

// Kept on globalThis so every route bundle shares one lock table — two routes
// (e.g. vocabulary PUT and import) can write the same file.
const g = globalThis as typeof globalThis & {
  __fileLocks?: Map<string, Promise<unknown>>;
};
const locks = (g.__fileLocks ??= new Map<string, Promise<unknown>>());

/**
 * Runs `fn` once every earlier call for the same file has finished, so a
 * read-modify-write can't interleave with another one and lose its change.
 */
export function withFileLock<T>(file: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(file) ?? Promise.resolve();
  const run = prev.then(fn, fn);
  const tail = run.catch(() => {});
  locks.set(file, tail);
  void tail.then(() => {
    if (locks.get(file) === tail) locks.delete(file);
  });
  return run;
}

/**
 * Writes via a temp file and a rename, so a crash mid-write leaves the old
 * file intact instead of a half-written one.
 */
export async function writeFileAtomic(file: string, data: string): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${randomUUID()}.tmp`;
  await writeFile(tmp, data, "utf8");
  await rename(tmp, file);
}
