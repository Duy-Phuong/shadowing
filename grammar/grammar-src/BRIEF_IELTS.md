# Brief: IELTS topic pages → condensed IELTS-tab card drafts

Working dir: /Users/phuong/Downloads/human-test/grammar-src

Sources for your group (page numbers in your prompt):
- `inbox/NNN_*.md` — Notion page text (header + text; ignore the IMAGE URLS footer)
- `ocr_out/NNN.md` — OCR of that page's images (for short "note" pages this IS the content)
Read every listed file. Don't read images.

These are IELTS Speaking/Writing materials by topic: sample answers (Part 1/2/3), topic vocabulary,
collocations, idea lists, question banks, techniques. Turn them into **condensed, reusable** cards for the
IELTS tab. Do NOT paste whole articles: per sample answer keep the question and a tightened model answer
(≤ ~120 words, keep the best phrases), per vocabulary list keep the most useful ~10–20 items with meaning.
Skip marketing, course ads, "đăng ký", author bios, repeated intros.

Avoid duplicates: `grep -i "<keyword>" index.txt` (lines "id | title | keywords"; IELTS cards are in
`ielts/fragments/`), and `grep -il "<phrase>" ielts/fragments/*.html` before writing a card.

## Target chapters (IELTS tab keys)
`sp-work` (work, study, skills, education), `sp-tech`, `sp-env`, `sp-travel`, `sp-health`, `sp-hobby`,
`sp-people` (people, family, relationships), `sp-society` (culture, society, social issues, crime,
government, advertising, shopping, money), `sp-exp` (experiences, decisions), `sk` (speaking techniques),
`wr` (Writing Task 2 skills/collocations), `we` (Writing essays/ideas by topic), `t1` (Task 1).

## Output: `drafts/<GROUP>.html`
Blocks, each preceded by the target key marker:
```
<!-- CARD sp-society -->
<section class="card" id="sp-society-v4-1">
  <h3>{{N}}.X Title <span class="part">Part 3</span><span class="new" title="Mới thêm — chưa xem lại">🆕</span></h3>
  ...
  <p class="src">Nguồn: Notion “IELTS speaking topics” — “Page title”.</p>
</section>
```
- ids `<key>-v4-<n>`: group A uses n from 1, group B from 101. Keep `{{N}}.X` literally.
- `part` badge: Part 1 / Part 2 / Part 3 / Từ vựng / Ý tưởng / Writing / Kỹ năng.
- Sample answer format (same as existing cards):
  `<h4 class="q"><span class="en">Question?</span></h4>` then `<p class="sample"><span class="en">Answer…</span></p>`,
  optional `<details class="trans"><summary>🇻🇳 Bản dịch</summary><p>…</p></details>` (only if source has one; shorten),
  vocab: `<details class="vocab" open><summary>📚 Từ vựng (N)</summary><div class="tbl"><table><tr><th>Từ / cụm</th><th>IPA</th><th>Nghĩa</th></tr><tr><td><span class="en">term</span></td><td class="ipa">/…/</td><td>nghĩa</td></tr></table></div></details>`
  (drop `open` for vocab under sample answers; keep `open` for vocabulary-only cards).
- Idea cards: `<ul class="pos"><li><b>Ý</b> — giải thích<span class="ex"><b>English example.</b></span></li></ul>`.
- Cue cards: `<div class="callout cue"><b>Cue card</b><br><b>Describe …</b><br><li>…</li></div>`.
- Other allowed markup: SPEC.md (tables, callout, callout warn, chips, `<s>` wrong forms).
- Group by sub-topic (e.g. one card "Government spending — từ vựng & ý tưởng", one per cue card).
  Aim for ~10–20 cards. Fix clear errors (grammar/spelling/translation) and mark `<span class="fix">✎ sửa</span>`.
- Valid HTML, escape `&`, no inline styles.

## Report (≤ 120 words)
Cards (id → title), pages skipped (why), garbled OCR, fixes.
