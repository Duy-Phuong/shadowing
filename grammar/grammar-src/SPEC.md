# Task: write one chapter of a Vietnamese English-grammar study handbook (HTML fragment)

Working dir for everything: /Users/phuong/Downloads/human-test/grammar-src
(all relative paths below are relative to it).

The learner is a Vietnamese speaker. Their Notion notebook "English grammar" was exported:
- `pages/NNN.md` — one file per Notion page: header (TITLE, TAGS, URL), then the page content as
  markdown-ish text. Tables are `| a | b |` rows. `[IMAGE #n]` marks where an image was.
  Long articles (ELSA Speak, ZIM, etc.) have complete text; their images were NOT downloaded (mostly
  decorative stock photos/ads) — ignore those `[IMAGE #n]` markers.
- `img/NNN_MM.png|jpg` — the images of the SHORT note pages (page NNN, image MM). These are the learner's
  real study notes (infographics, screenshots of lessons). They carry the content: READ EVERY ONE
  assigned to you with the Read tool and extract the rules/examples. If one is purely decorative or
  unreadable, skip it and mention it in your report.

Your group file (`groups/<key>.txt`) lists your chapter key, title, the page files and the images.
Read ALL of them before writing.

## What to produce

Write `fragments/<key>.html` — an HTML FRAGMENT (no <html>/<head>/<body>/<style>/<script>) that is one
chapter of the handbook, grouped by sub-topic (not page-by-page). Structure:

```html
<h2 class="chapter" id="KEY"><span class="num">{{N}}</span>Chapter title in Vietnamese (English)</h2>
<p class="chapter-intro">One or two sentences: what this chapter covers / why it matters.</p>

<section class="card" id="KEY-1">
  <h3>{{N}}.1 Sub-topic title</h3>
  ... content ...
</section>
<section class="card" id="KEY-2"> <h3>{{N}}.2 ...</h3> ... </section>
...
<section class="card exercise"> <h3>Luyện tập: ...</h3> ... </section>   (optional, see below)
<section class="card"><h3>Nguồn</h3><ol><li><a href="NOTION URL">Page title</a> — chữ / N ảnh</li>...</ol></section>
```
Keep `{{N}}` literally — it is replaced with the chapter number later. Every id must start with `KEY-`.

Also write `fragments/<key>.toc.json`:
`{"id":"KEY","title":"short chapter title","sections":[{"id":"KEY-1","title":"short title"}, ...]}`
(section titles WITHOUT the number; exercise sections included as "Luyện tập"; omit the Nguồn card).

## Allowed markup / CSS classes (already styled in the page — use only these)

Look at `/Users/phuong/Downloads/human-test/english-grammar.html` (chapters 1–4) for real examples of each.
- Tables: `<div class="tbl"><table><tr><th>..</th></tr><tr><td>..</td></tr></table></div>`; `td class="w"` = no-wrap cell.
- Lists with examples: `<ul class="pos"><li>Rule text<span class="ex"><b>English example.</b> — Vietnamese meaning.</span></li></ul>`
- Standalone example line: `<p class="ex"><b>English sentence.</b> — nghĩa tiếng Việt.</p>`
- Formula / structure: put it in `<div class="callout"><b>Công thức:</b> S + would rather + V (bare) …</div>`
  (use several lines with `<br>` if needed). Warnings / common mistakes: `<div class="callout warn">…</div>`.
- `<span class="en">English words</span>`, `<span class="ipa">/ipa/</span>`, `<span class="vi">muted note</span>`,
  `<mark class="s">-suffix</mark>` for highlighted endings/key words, `<s>wrong form</s>` for crossed-out mistakes.
- Word chips: `<div class="chips"><span class="chip">word</span>…</div>`
- Grid of small boxes: `<div class="grid"><div class="box"><strong>Heading</strong><span class="words">items</span></div></div>`
- `<h4>` for sub-headings inside a card.
- **New content badge:** every card you add or substantially change gets
  `<span class="new" title="Mới thêm — chưa xem lại">🆕</span>` at the end of its `<h3>`. The user deletes it
  after reviewing (browser edit mode + sync_back, or asks Claude). The TOC and the “🆕 Mục mới” button pick it up
  automatically.
- English example text inside `.en`, `.ex b` or `.words` is click-to-hear (🔊) — keep examples in those.
- Corrections of source errors: append `<span class="fix">✎ sửa</span>` right after the corrected text.
  Content you add that was not in the sources (only when needed to fill an obvious gap): `<span class="fix">✎ bổ sung</span>`.

## Exercises (interactive; the page already has the JS)

Only include exercises that exist in the sources (ELSA/ZIM articles often have "Bài tập" + "Đáp án"),
pick the best ≤ 8 items per exercise, ≤ 2 exercises per chapter. Verify every answer yourself; if the
source answer is wrong, use the correct one and say so in the `.ans` span.
Fill-in:
```html
<section class="card exercise">
  <h3>Luyện tập: title</h3>
  <p class="vi">instruction in Vietnamese</p>
  <div class="q">1. She <input type="text" data-a="has lived|has been living"> here since 2010. <span class="ans">has lived</span></div>
  <div class="ex-actions"><button class="primary check" type="button">Kiểm tra</button><button class="reveal" type="button">Hiện đáp án</button><span class="score"></span></div>
</section>
```
`data-a` = accepted answers, lowercase, separated by `|`. Multiple choice:
```html
<div class="q" data-a="B">2. Question …
  <div class="opts"><label><input type="radio" name="KEY-e1q2" value="A"> option</label><label><input type="radio" name="KEY-e1q2" value="B"> option</label></div>
  <span class="ans">optional short explanation</span></div>
```
Radio `name`s must be unique across the whole document: prefix them with `KEY-`.

## Content rules (important)

1. **Group by topic, merge duplicates.** Several pages often cover the same thing (e.g. two ELSA articles
   on "Would rather" plus an infographic). Merge them into one clean explanation; keep the best examples.
2. **Condense — do not copy articles.** Write your own concise explanation in Vietnamese: definition, formula(s),
   when to use, key distinctions, common mistakes, 1–3 short examples per rule (English + Vietnamese meaning).
   Never paste long paragraphs from the source; no marketing text, no "ELSA Speak/ZIM" promo, no "xem thêm" links.
   Tables of pure facts (verb forms, word lists, rule tables) may be kept complete — they are the learning content.
3. **Keep everything the learner noted.** Every rule/fact/example type that appears in their pages or images
   should be represented (condensed). The short personal notes and images matter most — they show what
   the learner chose to study. Do not add big new topics that aren't in the sources.
4. **Be correct.** You are an expert English teacher. Fix errors in the sources (wrong translations,
   typos, wrong rules) and mark them `✎ sửa`. Don't invent rules.
5. Vietnamese explanations (with proper diacritics), English examples. Short headings. No emoji spam.
6. Pages that are empty, or only contain links/nothing learnable: list them in the Nguồn card as "(trống)" /
   "(chỉ có link)" and in your report.
7. HTML must be valid and self-contained: escape `<`, `>`, `&` in text (`&lt;` `&gt;` `&amp;`), close every tag,
   no inline styles except trivial ones, no external images (don't embed the Notion images).
8. Size: aim for roughly 25–70 KB of HTML for the chapter — thorough but condensed.

## Report (your final message)
≤ 150 words: sections written, pages covered, pages/images skipped and why, any source errors fixed.
Do not paste the HTML in the report.
