# Brief: merge Notion "Conversation and synonyms" into the handbook

Working dir: /Users/phuong/Downloads/human-test/grammar-src (all paths relative to it).
Read `SPEC.md` first — its markup, CSS classes, content rules (condense, merge duplicates, fix errors with
`✎ sửa`, Vietnamese explanations + English examples, 🆕 badge on every card, valid escaped HTML) all apply.
Differences from SPEC.md are below.

## Input
`conv_groups/<GROUP>.md` — your pages, each starting with `=================== PAGE` + TITLE / TAGS / THEME / URL,
then the page text (already stripped of site boilerplate, links and image markers). Most long pages are
blog/YouTube-lesson articles ("Learn English with Harry", "My Lingua Academy", ESLBUZZ…): the learnable content
is the phrases/words, their meaning and when to use them, plus example sentences. Ignore chatter, intros, promo.
The file can be large — read it in chunks (Read with offset/limit) until you have read ALL of it.

## Avoid duplicates with the existing handbook
`index.txt` lists every existing card (`id | title | keywords`). Before writing a card, grep index.txt (and if
needed grep the fragment files: `grep -il "<phrase>" ielts/fragments/*.html vocab/fragments/*.html fragments/*.html`)
for its main phrases. If a topic already has a card with the same list, keep only what is NEW (a short card
"… — bổ sung" with the extra phrases) or skip it and mention it in your report. Do not edit existing files
unless your assignment says so.

## Output: new chapter(s)
For each chapter key assigned to you, write `<dir>/fragments/<key>.html` and `<dir>/fragments/<key>.toc.json`
exactly as SPEC.md describes (`{{N}}` placeholders, ids and radio names prefixed `<key>-`, a final Nguồn card
listing EVERY page you used with its URL — pages you skipped as duplicate/empty listed with "(đã có ở mục …)"
or "(trống)"). `<dir>` is `ielts` or `vocab` as given in your assignment. Do NOT touch order.json — the
coordinator inserts the keys.

Card style for phrase lists (the common case here): group phrases by function/nuance, one card per sub-topic,
tables like
`<div class="tbl"><table><tr><th>Cụm từ</th><th>Nghĩa</th><th>Dùng khi / sắc thái</th></tr>
<tr><td><span class="en">Phrase</span></td><td>nghĩa</td><td>formal / informal, context…</td></tr></table></div>`
plus 1–2 example sentences (`<p class="ex"><b>…</b> — …</p>`) where the source has them, and a `callout` for
tips / a `callout warn` for common mistakes. Word lists (adjectives, collocations, confusing pairs): table with
word, meaning, example; confusing words: a comparison table + the key rule.
Size guide: ~1 card per source page cluster; a chapter of 15–40 cards, 40–120 KB. Condense hard — a 20 KB
article usually becomes one card with a 10–25 row table.

## Output: draft cards for EXISTING chapters (only if your assignment mentions drafts)
Write `drafts/<GROUP>.html` in merge_drafts.py format: each card preceded by `<!-- CARD <existing key> -->`,
card id `<existing key>-cv<GROUP-letter-digit>-<n>` (e.g. `wr-cvA8-3`), h3 starting `{{N}}.X`, 🆕 badge,
a `<p class="src">Nguồn: <a href="URL">title</a></p>` at the end of each card.
Pick the target key from index.txt (the id prefix before the first `-<number>`).

## Report (final message, ≤150 words)
Chapters/cards written, pages covered, pages skipped as duplicate/empty, source errors fixed.
Before finishing validate every file you wrote and fix until it prints OK:
`python3 check_frag.py <dir>/fragments/<key>.html <key>` (chapters) · `python3 check_frag.py drafts/<GROUP>.html` (drafts).
