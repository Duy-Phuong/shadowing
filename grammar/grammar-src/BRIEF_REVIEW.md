# Brief: proofread & de-duplicate grammar chapters

Working dir: /Users/phuong/Downloads/human-test/grammar-src. Do NOT spawn sub-agents.
Read SPEC.md (markup rules) first. You own ONLY the files named in your prompt — never edit other files.
(`batch1.html` holds chapters 1–4 = ids c1-* … c4-*, b1-*; edit only its cards if it is assigned to you.)

You are an expert English grammar teacher proofreading a Vietnamese study handbook. Read every card of your
chapters carefully and fix:
1. **Wrong rules / explanations** (e.g. wrong tense usage, wrong verb pattern, over-general "always/never" rules,
   wrong formality claims). Fix the text; add `<span class="fix">✎ sửa</span>` after the corrected part.
2. **Wrong or unnatural English examples** (grammar, collocation, spelling, typos, OCR garbage) → correct them (✎ sửa).
3. **Wrong Vietnamese translations/explanations**, missing diacritics, typos → fix silently if trivial, ✎ sửa if meaning changed.
4. **Exercises**: check every answer (`data-a` accepted answers, `data-a` of radio questions, `.ans` text). Wrong key → fix.
5. **Duplicates inside your chapters**: two cards (or rows) teaching the same thing → merge into the better/earlier card
   (move any unique rows/examples there), then delete the other card and its entry in `<key>.toc.json`.
   Before deleting a card id, `grep -rn '#<id>"' fragments ielts/fragments vocab/fragments colloc/fragments batch1.html`
   and repoint any links to the kept card. Never delete a card that is the only place a point is taught.
6. Obvious leftovers (stray "Here is the text extracted…", empty rows, duplicated rows in a table) → remove.

Do NOT: rewrite correct content in your own style, change ids of kept cards, renumber `{{N}}.x` headings,
add 🆕 badges for proofreading fixes, remove existing ✎ labels, or add new topics (another agent handles gaps).
Edit card by card (Edit tool or a small Python script touching one card at a time) — never regenerate a file from memory.

Validate every file you changed: `python3 check_frag.py fragments/<key>.html <key>` → OK
(for batch1.html run `python3 assemble.py /tmp/x.html | tail -2` → "no problems").

Report (≤150 words): per chapter the number of fixes, the most important corrections (quote briefly), merged/deleted cards
(id → kept id), and anything you were unsure about (don't change uncertain points — list them).
