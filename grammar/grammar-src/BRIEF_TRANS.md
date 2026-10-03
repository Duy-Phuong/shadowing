# Brief: add missing Vietnamese translations to IELTS sample answers

Working dir: /Users/phuong/Downloads/human-test/grammar-src. Do NOT spawn sub-agents.
You own ONLY the chapter files named in your prompt (ielts/fragments/<key>.html) — never edit other files.

## What to do
In your files, find every card (`<section class="card" …>`) that contains a sample answer
(`<p class="sample">`) but has NO `<details class="trans">`. For each such question/answer add a translation
block, exactly in the existing house format:

```html
<details class="trans"><summary>🇻🇳 Bản dịch</summary><p><b>Câu hỏi dịch sang tiếng Việt?</b></p><p>Bản dịch câu trả lời…</p></details>
```

- Put it right AFTER the last `<p class="sample">` that belongs to that question (i.e. before the next
  `<h4 class="q">`, before `<details class="vocab">`, before `<p class="src">`, whichever comes first).
- A card with several questions gets one block per question. A Part 2 / long answer split over several
  `<p class="sample">` paragraphs gets ONE block after the last paragraph, with one `<p>` per paragraph.
- Essays in `we` (Writing): one block after the essay, one `<p>` per paragraph; translate the prompt as the `<b>` line.
- Translation: natural, accurate Vietnamese with proper diacritics (not word-by-word); keep English terms in
  parentheses only when useful. Escape `&` as `&amp;`, `<` `>` as entities.
- Do NOT change anything else: no rewording of the English, no new badges, no id changes, no reformatting.
- If an English answer has an obvious error, fix it minimally and add `<span class="fix">✎ sửa</span>`.

## How to edit safely
Files are large (50–180 KB). Work card by card with the Edit tool (unique old_string = the last sample
paragraph's closing text + following tag), or write a small Python script that inserts blocks by card id —
but never regenerate a whole file from memory.

## Check & report
After finishing each file: `python3 check_frag.py ielts/fragments/<key>.html <key>` must print OK, and
`grep -c 'class="sample"'` / `grep -c 'class="trans"'` should show every sample card translated.
Report (≤60 words): cards translated per file, anything skipped and why.
