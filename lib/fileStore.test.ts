import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { withFileLock, writeFileAtomic } from "./fileStore";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "filestore-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const readList = async (file: string): Promise<string[]> => {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return [];
  }
};

describe("withFileLock", () => {
  test("concurrent read-modify-writes keep every change", async () => {
    const file = path.join(dir, "list.json");
    await Promise.all(
      Array.from({ length: 25 }, (_, i) =>
        withFileLock(file, async () => {
          const list = await readList(file);
          await new Promise((r) => setTimeout(r, Math.random() * 5));
          await writeFileAtomic(file, JSON.stringify([...list, `item${i}`]));
        }),
      ),
    );
    expect((await readList(file)).sort()).toHaveLength(25);
  });

  test("a failed update doesn't block the next one", async () => {
    const file = path.join(dir, "x");
    await expect(
      withFileLock(file, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    await expect(withFileLock(file, async () => "ok")).resolves.toBe("ok");
  });
});

describe("writeFileAtomic", () => {
  test("creates missing folders and leaves no temp files", async () => {
    const file = path.join(dir, "nested", "a.txt");
    await writeFileAtomic(file, "hello");
    await writeFileAtomic(file, "world");
    expect(await readFile(file, "utf8")).toBe("world");
    expect(await readdir(path.dirname(file))).toEqual(["a.txt"]);
  });
});
