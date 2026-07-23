import { describe, expect, test } from "vitest";
import {
  addSource,
  parseSources,
  removeSource,
  serializeSources,
  type Source,
} from "./sources";

const a: Source = { channelId: "UCa", name: "A", url: "http://x/@a" };
const b: Source = { channelId: "UCb", name: "B", url: "http://x/@b" };

describe("sources store", () => {
  test("round-trips through parse/serialize, skipping junk", () => {
    const text = `${JSON.stringify(a)}\njunk\n${JSON.stringify(b)}`;
    expect(parseSources(text)).toEqual([a, b]);
    expect(parseSources(serializeSources([a, b]))).toEqual([a, b]);
  });

  test("addSource dedupes by channelId", () => {
    expect(addSource([a], b)).toEqual([a, b]);
    expect(addSource([a], { ...a, name: "A2" })).toEqual([a]);
  });

  test("removeSource removes by channelId", () => {
    expect(removeSource([a, b], "UCa")).toEqual([b]);
  });
});
