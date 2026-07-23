/**
 * Masks a sentence for dictation: every letter and digit becomes a dot while
 * spaces and punctuation are preserved, revealing structure but not the words.
 */
export function maskText(text: string): string {
  return text.replace(/[\p{L}\p{N}]/gu, "•");
}
