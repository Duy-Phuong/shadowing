import { describe, expect, test } from "vitest";
import { aoaFromRows, rowsFromAoa, type VocabRow } from "./vocabulary";

describe("rowsFromAoa", () => {
  // Mimics the real Vocabulary.xlsx: a few empty rows/columns before a header
  // row, then data. Columns are located by header name, not by position.
  const aoa = [
    ["", "", "", "", "", ""],
    ["", "", "", "", "", 46218],
    ["", "ID", "Name", "Type", "Description", "Unit"],
    ["", "1", "antonym", "/ˈæntənɪm/", "từ trái nghĩa", 2],
    ["", "2", "meanwhile", "adv", "trong lúc này", 2],
    ["", "", "", "", "", ""],
  ];

  test("finds the offset header row and maps columns by name", () => {
    expect(rowsFromAoa(aoa)).toEqual<VocabRow[]>([
      {
        id: "1",
        name: "antonym",
        type: "/ˈæntənɪm/",
        description: "từ trái nghĩa",
        unit: "2",
      },
      {
        id: "2",
        name: "meanwhile",
        type: "adv",
        description: "trong lúc này",
        unit: "2",
      },
    ]);
  });

  test("skips rows without a name", () => {
    const withBlank = [
      ["ID", "Name", "Type", "Description", "Unit"],
      ["3", "", "n", "no name", "1"],
      ["4", "keep", "v", "kept", "1"],
    ];
    expect(rowsFromAoa(withBlank).map((r) => r.name)).toEqual(["keep"]);
  });

  test("maps columns regardless of their order", () => {
    const reordered = [
      ["Unit", "Description", "Name", "Type", "ID"],
      ["5", "a greeting", "hello", "excl", "9"],
    ];
    expect(rowsFromAoa(reordered)).toEqual<VocabRow[]>([
      {
        id: "9",
        name: "hello",
        type: "excl",
        description: "a greeting",
        unit: "5",
      },
    ]);
  });

  test("returns an empty array when no header row is present", () => {
    expect(rowsFromAoa([["just", "some", "data"]])).toEqual([]);
  });
});

describe("aoaFromRows", () => {
  test("prepends a header row and orders the columns", () => {
    const rows: VocabRow[] = [
      {
        id: "1",
        name: "antonym",
        type: "/ˈæntənɪm/",
        description: "từ trái nghĩa",
        unit: "2",
      },
    ];
    expect(aoaFromRows(rows)).toEqual([
      ["ID", "Name", "Type", "Description", "Unit"],
      ["1", "antonym", "/ˈæntənɪm/", "từ trái nghĩa", "2"],
    ]);
  });
});
