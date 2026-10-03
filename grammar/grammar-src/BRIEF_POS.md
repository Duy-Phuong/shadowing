# Brief: tag part of speech for vocabulary rows

Working dir: /Users/phuong/Downloads/human-test/grammar-src. Do NOT spawn sub-agents. Do NOT edit any HTML file.

Input `conv_groups/P<n>.tsv`: one row per line: `KEY<TAB>English word/phrase<TAB>Vietnamese meaning`.
Output `conv_groups/P<n>.out.tsv`: one line per input line, same order: `KEY<TAB>TAG` — every KEY exactly once.

TAG = the part of speech of the English entry as used with that Vietnamese meaning:
- `n` noun / noun phrase / compound noun (Boarding Pass, a head of lettuce, baggage claim)
- `v` verb / verb phrase / phrasal verb (check in, take off, make a decision, hit the road when it means "leave")
- `adj` adjective / adjective phrase (well-off, full of energy, second-hand)
- `adv` adverb / adverbial phrase or linker used adverbially (especially, even, in addition, on the other hand)
- `prep` preposition / prepositional linker (due to, despite, in spite of, according to)
- `conj` conjunction (although, whereas, as long as, unless)
- `pron` pronoun (anyone, whoever)
- `idiom` a figurative idiom whose meaning isn't literal (piece of cake, break a leg, once in a blue moon)
- several values allowed when the entry genuinely is both, comma-separated in this order: `n, v`
- `-` (leave empty) for anything that is NOT a word/phrase: full sentences or clauses (has subject + verb),
  questions, greetings/responses and other conversational utterances (How are you?, I'm fine., Thank you, Excuse me,
  Nice to meet you), headings/labels (e.g. "Connecting Words – Illustration"), empty or garbage rows.

Be consistent and quick: decide from the English text first, use the Vietnamese meaning only to disambiguate
(e.g. "record" n "bản ghi" vs v "ghi lại"). Write the output with a small Python script if convenient.
When done, verify: `wc -l` of input and output are equal and every KEY matches. Report ≤40 words (counts per tag).
