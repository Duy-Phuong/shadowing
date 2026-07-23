import { describe, expect, test } from "vitest";
import { maskText } from "./maskText";

describe("maskText", () => {
  test("replaces each letter with a dot, keeping punctuation and spaces", () => {
    expect(maskText("Hello, I'm Lucy.")).toBe("•••••, •'• ••••.");
  });

  test("masks digits too", () => {
    expect(maskText("It's 2024!")).toBe("••'• ••••!");
  });

  test("preserves word spacing", () => {
    expect(maskText("From the BBC")).toBe("•••• ••• •••");
  });

  test("returns an empty string unchanged", () => {
    expect(maskText("")).toBe("");
  });
});
