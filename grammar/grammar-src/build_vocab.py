"""Build the 📚 Từ vựng tab from Vocabulary-new.xlsx, sheet "group" (vocabulary grouped by scene/topic).

Rows with a Name but no Type/Description are scene headings (871, e.g. "Airport Security"); they come in
topic runs, so each run → one chapter (vocab/fragments/v-NN.html), each heading → one card with a table
Từ / cụm | Loại | Nghĩa. Headings with the same name ("Weather", "Weather (2)") are merged.
Usage: python3 build_vocab.py [--dry-run] [--force]
"""
import html, json, re, sys
from collections import OrderedDict
from pathlib import Path
import openpyxl

HERE = Path(__file__).parent
XLSX = HERE.parent / 'Vocabulary-new.xlsx'
OUT = HERE / 'vocab' / 'fragments'
dry, force = '--dry-run' in sys.argv, '--force' in sys.argv
esc = lambda s: html.escape(s, quote=False)
S = lambda c: '' if c is None else str(c).strip()

# a chapter starts at the first heading that begins with one of these (in sheet order)
CHAPTERS = [
    ('Airport', 'Sân bay & máy bay'),
    ('Motorcycle Parts', 'Giao thông & phương tiện'),
    ('Hotel', 'Khách sạn & lưu trú'),
    ('Fruits', 'Ăn uống & nấu nướng'),
    ('Supermarket', 'Mua sắm & dịch vụ'),
    ('Job', 'Công việc, trường học & xã hội'),
    ('Common Illnesses', 'Sức khỏe & y tế'),
    ('army', 'Cơ quan, công trình & lực lượng'),
    ('Rooms in the House', 'Nhà cửa & đồ gia dụng'),
    ('Women’s Heels', 'Thời trang & làm đẹp'),
    ('In the Garden Vocabulary', 'Thiên nhiên, vườn & môi trường'),
    ('List of Domestic Animals', 'Động vật'),
    ('Blue Sky', 'Thời tiết & mùa'),
    ('List of Hobbies For Men', 'Du lịch, biển & hoạt động ngoài trời'),
    ('FIFA World Cup', 'Thể thao'),
    ('List of Holidays', 'Lễ hội & dịp đặc biệt'),
    ('Movie Genre', 'Giải trí & sở thích'),
    ('Personal qualities', 'Con người: tính cách, ngoại hình & cảm xúc'),
    ('Days Of The Week', 'Thời gian, số & tiền'),
    ('Verbs of Body Movement', 'Từ dễ nhầm, sắc thái & cách dùng'),
    ('One note', 'Cách nói ngắn thông dụng'),
    ('Hư ổ cắm điện', 'Đời sống hằng ngày (tình huống)'),
]
TYPE = {'n': 'danh từ', 'v': 'động từ', 'a': 'tính từ', 'adj': 'tính từ', 'adv': 'trạng từ', 'n + n': 'danh từ ghép',
        'a + n': 'cụm danh từ', 'phrase verb': 'cụm động từ', 'phrasal verb': 'cụm động từ', 'idiom': 'thành ngữ',
        'v + n': 'cụm động từ', 'prep': 'giới từ', 'phrase': 'cụm từ'}

wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
rows = [(S(r[2]), S(r[3]), S(r[4])) for r in list(wb['group'].iter_rows(values_only=True))[6:] if len(r) > 5]

chapters, ch, card_key = [], None, None
next_ci = 0
for name, typ, desc in rows:
    if not name:
        continue
    is_head = not typ and not desc
    if is_head:
        if next_ci < len(CHAPTERS) and name.startswith(CHAPTERS[next_ci][0]):
            ch = {'title': CHAPTERS[next_ci][1], 'cards': OrderedDict()}; chapters.append(ch); next_ci += 1
        if ch is None or name.lower() in ('x',) or name.startswith('http'):
            card_key = None if name.lower() == 'x' else card_key
            continue
        base = re.sub(r'\s*\(\d+\)\s*$', '', name).strip()
        card_key = base.lower()
        ch['cards'].setdefault(card_key, [base, []])
        continue
    if ch is None:
        continue
    if card_key is None:
        card_key = 'khác'; ch['cards'].setdefault(card_key, ['Khác', []])
    ch['cards'][card_key][1].append((name, typ, desc))

# ---- extra sheets: idiom (one card, A–Z) and conversation (cards per heading)
def sheet_rows(name):
    return [(S(r[2]), S(r[3]), S(r[4])) for r in list(wb[name].iter_rows(values_only=True))[6:] if len(r) > 4 and S(r[2])]

idioms = sorted({(n.strip(), t, d) for n, t, d in sheet_rows('idiom') if d}, key=lambda x: x[0].lower())
buckets = OrderedDict()
for n_, t_, d_ in idioms:
    k = n_[0].upper() if n_[0].isalpha() else '#'
    grp = 'A – F' if k <= 'F' else 'G – M' if k <= 'M' else 'N – S' if k <= 'S' else 'T – Z'
    buckets.setdefault(grp.lower(), [f'Thành ngữ {grp}', []])[1].append((n_, 'thành ngữ', d_))
chapters.append({'title': 'Thành ngữ (Idioms)', 'cards': buckets, 'sheet': 'idiom'})

conv = sheet_rows('conversation')
cards_c, head = OrderedDict(), None
HEADISH = re.compile(r'^(\d+\s+)?(other |different |better |common |polite )?(ways?|how|expressions?|phrases|asking|responding|synonyms|useful)\b', re.I)
SUBHEAD = re.compile(r'^(list of|(\d+\s+)?(other |different )?synonyms for|(\d+\s+)?(other |different )?ways to|other words for)', re.I)
for i, (n_, t_, d_) in enumerate(conv):
    if SUBHEAD.match(n_) and len(n_) < 70:
        head = n_.rstrip(':').strip().lower(); cards_c.setdefault(head, [n_.rstrip(':').strip(), []]); continue
    if not d_ and not t_:
        nxt = next((r for r in conv[i + 1:i + 2]), ('', '', ''))
        if HEADISH.match(n_) or (nxt[2] and head is None) or (nxt[2] and not re.search(r'[.?!…]$', n_) and len(n_) < 50
                                                                and (head is None or cards_c[head][1])):
            if n_.lower().startswith('read more'):
                continue
            head = n_.rstrip(':').strip().lower(); cards_c.setdefault(head, [n_.rstrip(':').strip(), []]); continue
    if head is None:
        head = 'câu giao tiếp chung'; cards_c.setdefault(head, ['Câu giao tiếp chung', []])
    cards_c[head][1].append((n_, t_, d_))
chapters.append({'title': 'Mẫu câu hội thoại (Conversation)', 'cards': cards_c, 'sheet': 'conversation'})

order, total = [], 0
for ci, chp in enumerate(chapters, 1):
    key = f'v-{ci:02d}'
    cards, secs = [], []
    k = 0
    split = []
    for head, items in chp['cards'].values():
        if len(items) > 150:
            n_parts = -(-len(items) // 100)
            split += [(f'{head} (phần {j + 1})', items[j * 100:(j + 1) * 100]) for j in range(n_parts)]
        else:
            split.append((head, items))
    for head, items in split:
        seen, clean = set(), []
        for n_, t_, d_ in items:
            sig = re.sub(r'[^a-z0-9]', '', n_.lower()) + '|' + d_[:20].lower()
            if sig not in seen:
                seen.add(sig); clean.append((n_, t_, d_))
        if not clean:
            continue
        k += 1; total += len(clean)
        cid = f'{key}-{k}'
        secs.append({'id': cid, 'title': f'{head[:48]} ({len(clean)})'})
        trs = ''.join(f'<tr><td><span class="en">{esc(n_)}</span></td>'
                      f'<td class="w">{esc(TYPE.get(t_.lower(), t_)) if t_ else ""}</td><td>{esc(d_)}</td></tr>'
                      for n_, t_, d_ in clean)
        cards.append(f'<section class="card" id="{cid}">\n  <h3>{{{{N}}}}.{k} {esc(head)} <span class="part">{len(clean)}</span></h3>\n'
                     f'  <div class="tbl"><table><tr><th>Từ / cụm</th><th>Loại</th><th>Nghĩa</th></tr>{trs}</table></div>\n</section>')
    n_items = sum(int(s['title'].rsplit('(', 1)[1][:-1]) for s in secs)
    print(f'{key}: {chp["title"]} — {len(cards)} cards, {n_items} items')
    order.append(key)
    if dry:
        continue
    f = OUT / f'{key}.html'
    if f.exists() and not force:
        print('   skip (exists)'); continue
    OUT.mkdir(parents=True, exist_ok=True)
    f.write_text(f'<h2 class="chapter" id="{key}"><span class="num">{{{{N}}}}</span>{esc(chp["title"])}'
                 f'<span class="new" title="Mới thêm — chưa xem lại">🆕</span></h2>\n'
                 f'<p class="chapter-intro">{n_items} từ / cụm từ trong {len(cards)} bối cảnh. Nguồn: Vocabulary-new.xlsx — sheet “{chp.get("sheet", "group")}”. '
                 f'Rê chuột lên từ tiếng Anh rồi bấm 🔊 để nghe.</p>\n\n' + '\n\n'.join(cards) + '\n')
    (OUT / f'{key}.toc.json').write_text(json.dumps({'id': key, 'title': chp['title'], 'sections': secs}, ensure_ascii=False))
print(f'TOTAL {total} items, {len(order)} chapters (group sheet: {len(CHAPTERS)} + idiom + conversation)')
if not dry:
    (HERE / 'vocab' / 'order.json').write_text(json.dumps(order))
