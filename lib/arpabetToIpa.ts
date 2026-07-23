const VOWELS = new Set([
  "AA", "AE", "AH", "AO", "AW", "AY", "EH", "ER",
  "EY", "IH", "IY", "OW", "OY", "UH", "UW",
]);

const MAP: Record<string, string> = {
  AA: "ɑ", AE: "æ", AO: "ɔ", AW: "aʊ", AY: "aɪ", EH: "ɛ", ER: "ɝ",
  EY: "eɪ", IH: "ɪ", IY: "i", OW: "oʊ", OY: "ɔɪ", UH: "ʊ", UW: "u",
  B: "b", CH: "tʃ", D: "d", DH: "ð", F: "f", G: "ɡ", HH: "h", JH: "dʒ",
  K: "k", L: "l", M: "m", N: "n", NG: "ŋ", P: "p", R: "r", S: "s",
  SH: "ʃ", T: "t", TH: "θ", V: "v", W: "w", Y: "j", Z: "z", ZH: "ʒ",
};

interface Segment {
  ipa: string;
  isVowel: boolean;
  stress: string | null;
}

/**
 * Converts a CMU-dictionary ARPAbet pronunciation (e.g. "HH AH0 L OW1") to a
 * bare IPA string (e.g. "həˈloʊ"). Stress marks are placed before the onset of
 * the stressed syllable and omitted for monosyllabic words.
 */
export function arpabetToIpa(arpabet: string): string {
  const phonemes = arpabet.trim().split(/\s+/).filter(Boolean);
  if (phonemes.length === 0) return "";

  const segments: Segment[] = phonemes.map((p) => {
    const match = p.match(/^([A-Z]+)([012])?$/);
    const base = match?.[1] ?? p;
    const stress = match?.[2] ?? null;
    const isVowel = VOWELS.has(base);
    let ipa: string;
    if (base === "AH") ipa = stress === "0" ? "ə" : "ʌ";
    else ipa = MAP[base] ?? "";
    return { ipa, isVowel, stress };
  });

  const vowelCount = segments.filter((s) => s.isVowel).length;
  const marks = new Array<string>(segments.length).fill("");

  if (vowelCount > 1) {
    segments.forEach((seg, i) => {
      if (!seg.isVowel || seg.stress === "0" || seg.stress === null) return;
      // Walk back over the onset consonants to the syllable start.
      let onset = i;
      while (onset - 1 >= 0 && !segments[onset - 1].isVowel) onset--;
      marks[onset] = seg.stress === "1" ? "ˈ" : "ˌ";
    });
  }

  return segments.map((seg, i) => marks[i] + seg.ipa).join("");
}
