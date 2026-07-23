import { describe, expect, test } from "vitest";
import { arpabetToIpa } from "./arpabetToIpa";

describe("arpabetToIpa", () => {
  test("omits the stress mark for a monosyllable", () => {
    expect(arpabetToIpa("W IH1 DH")).toBe("wɪð");
  });

  test("places primary stress before the stressed syllable's onset", () => {
    expect(arpabetToIpa("HH AH0 L OW1")).toBe("həˈloʊ");
  });

  test("puts stress before a leading consonant of a stressed first syllable", () => {
    expect(arpabetToIpa("L UW1 S IY0")).toBe("ˈlusi");
  });

  test("renders AH0 as schwa and stressed AH as ʌ", () => {
    // "a" -> AH0 (schwa), "up" -> AH1 P
    expect(arpabetToIpa("AH0")).toBe("ə");
    expect(arpabetToIpa("AH1 P")).toBe("ʌp");
  });

  test("handles secondary stress", () => {
    expect(arpabetToIpa("AE1 D V EH2 N T")).toBe("ˈæˌdvɛnt");
  });

  test("returns an empty string for empty input", () => {
    expect(arpabetToIpa("")).toBe("");
  });
});
