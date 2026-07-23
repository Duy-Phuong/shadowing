export type DiffType = "correct" | "wrong" | "missing" | "extra";

export interface DiffToken {
  type: DiffType;
  /** Original expected word (present for correct, wrong, missing). */
  expected?: string;
  /** Original typed word (present for correct, wrong, extra). */
  typed?: string;
}

const tokenize = (s: string): string[] => s.trim().split(/\s+/).filter(Boolean);

/** Lowercase and strip surrounding punctuation for comparison. */
const normalize = (w: string): string =>
  w.toLowerCase().replace(/[^a-z0-9']/g, "");

/**
 * Word-level diff between the expected sentence and what the user typed,
 * aligned by minimum edit distance. Comparison is case- and
 * punctuation-insensitive; original words are preserved for display.
 */
export function diffWords(expected: string, typed: string): DiffToken[] {
  const e = tokenize(expected);
  const t = tokenize(typed);
  const ne = e.map(normalize);
  const nt = t.map(normalize);

  // dp[i][j] = edit distance between e[0..i) and t[0..j)
  const dp: number[][] = Array.from({ length: e.length + 1 }, () =>
    new Array<number>(t.length + 1).fill(0),
  );
  for (let i = 0; i <= e.length; i++) dp[i][0] = i;
  for (let j = 0; j <= t.length; j++) dp[0][j] = j;
  for (let i = 1; i <= e.length; i++) {
    for (let j = 1; j <= t.length; j++) {
      const subCost = ne[i - 1] === nt[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j - 1] + subCost,
        dp[i - 1][j] + 1, // delete expected word (missing)
        dp[i][j - 1] + 1, // insert typed word (extra)
      );
    }
  }

  // Backtrack into aligned tokens.
  const tokens: DiffToken[] = [];
  let i = e.length;
  let j = t.length;
  while (i > 0 || j > 0) {
    const subCost = i > 0 && j > 0 && ne[i - 1] === nt[j - 1] ? 0 : 1;
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + subCost) {
      tokens.push(
        subCost === 0
          ? { type: "correct", expected: e[i - 1], typed: t[j - 1] }
          : { type: "wrong", expected: e[i - 1], typed: t[j - 1] },
      );
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      tokens.push({ type: "missing", expected: e[i - 1] });
      i--;
    } else {
      tokens.push({ type: "extra", typed: t[j - 1] });
      j--;
    }
  }

  return tokens.reverse();
}
