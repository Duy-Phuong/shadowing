# Brief: local screenshots (folder images/) → IELTS sample-answer drafts

Working dir: /Users/phuong/Downloads/human-test/grammar-src. Do NOT spawn sub-agents.
Read BRIEF_IELTS.md (card format for sample answers, target chapters) and SPEC.md (markup rules) first.

Input `conv_groups/I<n>.md`: OCR of phone screenshots of IELTS / Aptis Speaking sample answers
(Part 1/2/3, question + answer, sometimes with a Vietnamese translation, sometimes vocabulary).
Screens are in filename order and an answer may continue on the next image — join them. Ignore phone UI
noise (clock, "Find related content", "Search", like counts, hashtags, @handles, app names, watermarks like IELTSIKES).
OCR can garble words — fix obvious errors silently.

## For every question/answer
1. Check whether it already exists: `grep -il "<6–8 distinctive words of the answer>" ielts/fragments/*.html`
   and also grep the question text. If the same question with an essentially same answer exists → skip it
   (list it in the tsv, see below). If the question exists but this answer is different and good, you may
   add it as an alternative only if clearly better/different; otherwise skip.
2. If new → a draft card in `drafts/<GROUP>.html` (merge_drafts format: `<!-- CARD <key> -->` + card,
   id `<key>-img<GROUP-digit>-<n>`, h3 `{{N}}.X Topic — …` with `<span class="part">Part N</span>` and 🆕 badge).
   Classify into the right topic chapter: sp-work (work, study, skills, education), sp-tech, sp-env, sp-travel,
   sp-health, sp-hobby, sp-people (people, family, friends, relationships), sp-society (culture, gifts, shopping,
   money, news, society), sp-exp (experiences, events, decisions). Several questions on one topic/part → one card.
   Aptis answers: same chapters, add "(Aptis)" to the h3.
3. Format per question: `<h4 class="q"><span class="en">Q?</span></h4>`, `<p class="sample"><span class="en">Answer</span></p>`,
   then ALWAYS a translation `<details class="trans"><summary>🇻🇳 Bản dịch</summary><p><b>câu hỏi</b></p><p>bản dịch</p></details>`
   — use the screenshot's Vietnamese if present (fix OCR errors), otherwise write a natural translation yourself.
   Optional `<details class="vocab">` table with 3–8 useful phrases (Từ / cụm · IPA · Nghĩa) when the answer has good ones.
   End each card with `<p class="src">Nguồn: ảnh chụp màn hình — images/IMG_xxxx.PNG, …</p>`.
4. NEVER nest a `<section>` inside a card. Keep answers as in the source (lightly corrected), don't pad them.

Also write `conv_groups/<GROUP>_skip.tsv`: one line per skipped image: `images/<file><TAB>existing card id or "NOISE"<TAB>short note`.
Every image in your group must appear in a card's src line or in the tsv.
Validate: `python3 check_frag.py drafts/<GROUP>.html` → OK. Report ≤80 words (cards per chapter, skipped count).
