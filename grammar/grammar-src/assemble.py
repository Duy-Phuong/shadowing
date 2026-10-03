"""Assemble the full handbook from the batch-1 file (chapters 1-4) + fragments/*.html."""
import json, re, sys, html
from html.parser import HTMLParser
from pathlib import Path

SCR = Path(__file__).parent
SRC = SCR.parent / 'english-grammar.html'
BATCH1 = SCR / 'batch1.html'          # frozen copy of the first version
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else SRC
ORDER = json.load(open(SCR / 'order.json'))

b1 = BATCH1.read_text()

head = b1[:b1.index('<body>')]
css_extra = """
.search { display: block; width: 100%; height: 38px; font: inherit; font-size: 14px; padding: 0 36px 0 34px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); color: var(--ink); text-overflow: ellipsis; -webkit-appearance: none; appearance: none; }
.search::placeholder { color: var(--muted); opacity: .85; }
.search::-webkit-search-cancel-button { cursor: pointer; }

.results { list-style: none; margin: 0 0 12px; padding: 0; font-size: 13px; }
.results a { color: var(--accent); }
.results .none { color: var(--muted); padding: 2px 8px; }
html { scroll-padding-top: 72px; }
.tabbar { position: sticky; top: 0; z-index: 7; background: var(--bg); border-bottom: 1px solid var(--line); }
.tabbar .in { max-width: 1180px; margin: 0 auto; padding: 8px 24px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.tab { font-weight: 600; font-size: 15px; padding: 7px 16px; border-radius: 999px; }
.tab.active { background: var(--accent); color: var(--bg); border-color: var(--accent); }
.tabbar .tools { margin-left: auto; display: flex; gap: 6px; flex-wrap: wrap; }
.tabbar .tools button { font-size: 13px; padding: 5px 10px; }
.layout[hidden] { display: none !important; }
nav.toc { top: 56px; max-height: calc(100vh - 56px); }
.navgroup { margin: 18px 0 4px; font-size: 12px; font-weight: 700; letter-spacing: .06em; color: var(--accent); text-transform: uppercase; }
.part { font-size: 12px; font-weight: 600; border: 1px solid var(--accent); color: var(--accent); border-radius: 999px; padding: 1px 8px; margin-left: 6px; vertical-align: middle; white-space: nowrap; }
h4.q { margin: 16px 0 6px; font-size: 16px; }
p.sample { margin: 6px 0; line-height: 1.7; }
p.sample.li { margin-left: 18px; }
details.trans, details.vocab { margin: 10px 0 0; border: 1px solid var(--line); border-radius: 8px; padding: 6px 12px; background: var(--bg); }
details.trans summary, details.vocab summary { cursor: pointer; font-weight: 600; font-size: 14px; }
details.trans p { color: var(--muted); font-size: 15px; }
.callout.cue li { margin-left: 18px; }
.form { font-size: 12px; color: var(--muted); border: 1px solid var(--line); border-radius: 999px; padding: 0 7px; white-space: nowrap; }
@media (max-width: 900px) { .tabbar .in { padding: 8px 16px; } .tabbar .tools { margin-left: 0; } nav.toc { top: 0; } }
/* one-line header on wide screens: tabs left, tools right */
@media (min-width: 901px) {
  .tabbar .in { max-width: none; flex-wrap: nowrap; gap: 6px; }
  .tabbar .tools { flex-wrap: nowrap; gap: 4px; }
  .tab { padding: 6px 12px; font-size: 14px; white-space: nowrap; }
  .tabbar .tools button { white-space: nowrap; padding: 5px 8px; }
}
@media (min-width: 901px) and (max-width: 1250px) {
  .tabbar .tools button { font-size: 12px; padding: 4px 6px; }
  .tab { padding: 5px 10px; font-size: 13px; }
}
nav.toc details { margin: 2px 0; }
nav.toc summary { cursor: pointer; font-weight: 600; padding: 3px 0; list-style: none; display: flex; gap: 4px; }
nav.toc summary::-webkit-details-marker { display: none; }
nav.toc summary::before { content: '▸'; color: var(--muted); width: 12px; flex: none; }
nav.toc details[open] > summary::before { content: '▾'; }
nav.toc summary a { padding: 0 4px; }
nav.toc details ol { list-style: none; margin: 2px 0 8px 14px; padding-left: 8px; border-left: 1px solid var(--line); }
nav.toc details li a { color: var(--muted); font-weight: 400; }
body.editing main section.card { outline: 1px dashed var(--accent); }
body.editing main { caret-color: var(--accent); }
.new { font-size: 13px; margin-left: 6px; vertical-align: middle; cursor: help; }
.spk-target { background: var(--accent-soft); border-radius: 4px; }
#spk { position: absolute; z-index: 6; font-size: 14px; line-height: 1; padding: 5px 7px; border-radius: 999px; background: var(--surface); border: 1px solid var(--accent); box-shadow: 0 2px 6px rgba(0,0,0,.15); cursor: pointer; }
#spk.on { background: var(--accent); }
.speaking { background: var(--accent-soft); border-radius: 4px; }
#toTop { position: fixed; right: 16px; bottom: 16px; z-index: 5; box-shadow: 0 2px 8px rgba(0,0,0,.12); }
@media (max-width: 900px) { nav.toc .inner { display: none; } nav.toc.open .inner { display: block; } }
/* performance: skip layout/paint of off-screen cards (1,900 cards, ~200k nodes) */
main section.card { content-visibility: auto; contain-intrinsic-size: auto 480px; }
@media print { main section.card { content-visibility: visible; } #tblTools, #toTop, .tabbar { display: none !important; } }
/* UI/UX */
tbody tr:hover td { background: var(--accent-soft); }
.results li a { display: block; padding: 3px 8px; border-radius: 6px; text-decoration: none; }
.results li a small { display: block; color: var(--muted); font-size: 11px; }
.results li a.first, .results li a:hover { background: var(--accent-soft); }
.results .count { color: var(--muted); padding: 2px 8px 6px; font-size: 12px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.results .backToc { font-size: 12px; padding: 2px 8px; }
nav.toc a.current { background: var(--accent-soft); color: var(--accent) !important; font-weight: 600; }
.search-wrap { position: relative; margin-bottom: 10px; }
.search-wrap::before { content: ''; position: absolute; left: 12px; top: 50%; width: 11px; height: 11px; margin-top: -8px; border: 2px solid var(--muted); border-radius: 50%; pointer-events: none; }
.search-wrap::after { content: ''; position: absolute; left: 23px; top: 50%; width: 6px; height: 2px; margin-top: 4px; background: var(--muted); transform: rotate(45deg); pointer-events: none; }
.search-wrap kbd { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font: 11px/1 ui-monospace, monospace; color: var(--muted); background: var(--bg); border: 1px solid var(--line); border-bottom-width: 2px; border-radius: 5px; padding: 3px 6px; pointer-events: none; }
.search:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.tocToggle { display: none; width: 100%; height: 38px; border-radius: 10px; margin-bottom: 10px; text-align: left; padding: 0 12px; }
@media (max-width: 900px) { .tocToggle { display: block; } }
@media (hover: none) { .search-wrap kbd { display: none; } .search { padding-right: 12px; } }
.search:focus + kbd, .search:not(:placeholder-shown) + kbd { display: none; }
#saveBtn.dirty { background: var(--warn); border-color: var(--warn); color: var(--bg); }
body.editing main td:focus-within, body.editing main th:focus-within { outline: 2px solid var(--accent); outline-offset: -2px; }
body.editing main td:empty::before { content: '…'; color: var(--muted); }
body.hide-fix main section.card .fix { display: none; }
.xref { font-size: 13px; color: var(--muted); margin: 12px 0 0; padding-top: 8px; border-top: 1px dashed var(--line); }
.xref a { text-decoration: none; }
.xref a:hover { text-decoration: underline; }
.xref small { color: var(--muted); }
#tblTools { position: absolute; z-index: 8; max-width: calc(100vw - 16px); display: flex; flex-wrap: wrap; gap: 4px; padding: 4px; background: var(--surface); border: 1px solid var(--accent); border-radius: 10px; box-shadow: 0 4px 14px rgba(0,0,0,.15); }
#tblTools[hidden] { display: none; }
#tblTools button { font-size: 12px; padding: 3px 8px; }
#tblTools button.del:hover { border-color: var(--bad); color: var(--bad); }
#tblTools .sep { width: 1px; background: var(--line); margin: 2px 2px; }
"""
head = head.replace('</style>', css_extra + '</style>')
head = head.replace('@media (max-width: 900px) {\n  .layout', '@media (max-width: 900px) {\n  .layout')

main_start = b1.index('<!-- ============ CHAPTER 1 ============ -->')
ch5 = b1.index('<!-- ============ CHAPTER 5 ============ -->')
src_card = b1.index('<section class="card" id="sources">')
main_end = b1.index('</main>')
chapters_1_4 = b1[main_start:ch5]
ex_part = b1[ch5:src_card]
ex_part = re.sub(r'<h2 class="chapter" id="c5">.*?</h2>\s*<p class="chapter-intro">(.*?)</p>',
                 r'<section class="card" id="c4-ex"><h3>4.4 Luyện tập (chương 1–4)</h3><p>\1</p></section>',
                 ex_part, flags=re.S)
old_sources = b1[src_card:main_end].replace('id="sources"', 'id="c4-src"').replace(
    'Nguồn (5 trang Notion trong đợt này)', 'Nguồn (chương 1–4)')
script = b1[b1.index('<script>'):b1.index('</script>') + len('</script>')]

# ---- TOC for chapters 1-4 (from the batch-1 nav)
toc = [
    {'id': 'c1', 'title': 'Từ loại', 'sections': [
        ('c1-1', 'Tổng quan 9 từ loại'), ('c1-2', 'Danh từ'), ('c1-3', 'Động từ'), ('c1-4', 'Tính từ'),
        ('c1-5', 'Trạng từ'), ('c1-6', 'Giới từ'), ('c1-7', 'Liên từ & Thán từ'),
        ('c1-8', 'Đại từ & Từ hạn định'), ('c1-9', 'Chuyển đổi từ loại')]},
    {'id': 'c2', 'title': 'Đếm được / Không đếm được', 'sections': [
        ('c2-1', 'Danh từ đếm được'), ('c2-2', 'Danh từ không đếm được'), ('c2-3', '30 từ không đếm được'),
        ('c2-4', 'Mạo từ & lượng từ'), ('c2-5', 'Từ mang cả hai nghĩa'), ('c2-6', 'Bảng so sánh'),
        ('c2-7', 'Danh sách không đếm được theo nhóm'), ('c2-8', 'Đơn vị đếm & từ tương đương'), ('c2-9', 'Từ đổi nghĩa khi đếm được')]},
    {'id': 'c3', 'title': 'Số nhiều của danh từ', 'sections': [
        ('c3-1', 'Quy tắc thêm s / es'), ('c3-2', 'Bất quy tắc'), ('c3-3', 'Không thay đổi'),
        ('c3-4', 'Danh từ ghép & tên họ')]},
    {'id': 'c4', 'title': 'Danh từ luôn số nhiều', 'sections': [
        ('c4-1', 'Đồ vật hai phần'), ('c4-2', 'Các từ luôn số nhiều khác'), ('c4-3', 'Tận cùng -s nhưng số ít'),
        ('c4-ex', 'Luyện tập')]},
]

class Checker(HTMLParser):
    VOID = {'br', 'input', 'img', 'hr', 'meta', 'link', 'wbr', 'col'}
    def __init__(self):
        super().__init__(); self.stack = []; self.errors = []; self.ids = []; self.radios = set()
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a: self.ids.append(a['id'])
        if tag == 'input' and a.get('type') == 'radio': self.radios.add(a.get('name'))
        if tag not in self.VOID: self.stack.append((tag, self.getpos()))
    def handle_endtag(self, tag):
        if tag in self.VOID: return
        if self.stack and self.stack[-1][0] == tag: self.stack.pop(); return
        # tolerate implicitly closed <p>/<li>
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                skipped = [t for t, _ in self.stack[i + 1:]]
                if any(t not in ('p', 'li') for t in skipped):
                    self.errors.append(f'</{tag}> at {self.getpos()} closes over {skipped}')
                del self.stack[i:]; return
        self.errors.append(f'stray </{tag}> at {self.getpos()}')

def ensure_ids(text, prefix):
    n = [0]
    def fix(m):
        n[0] += 1
        return m.group(0)[:-1] + f' id="{prefix}-x{n[0]}">'
    return re.sub(r'<section class="card[^"]*"(?![^>]*\bid=)[^>]*>', fix, text)

b1_fixed = ensure_ids(b1, 'b1')
if b1_fixed != b1:
    BATCH1.write_text(b1_fixed); b1 = b1_fixed
    chapters_1_4 = b1[b1.index('<!-- ============ CHAPTER 1 ============ -->'):b1.index('<!-- ============ CHAPTER 5 ============ -->')]
    ex_part = re.sub(r'<h2 class="chapter" id="c5">.*?</h2>\s*<p class="chapter-intro">(.*?)</p>',
                     r'<section class="card" id="c4-ex"><h3>4.4 Luyện tập (chương 1–4)</h3><p>\1</p></section>',
                     b1[b1.index('<!-- ============ CHAPTER 5 ============ -->'):b1.index('<section class="card" id="sources">')], flags=re.S)

body_parts, all_ids, problems = [], [], []
n = 4
for key in ORDER:
    frag_p, toc_p = SCR / f'fragments/{key}.html', SCR / f'fragments/{key}.toc.json'
    if not frag_p.exists() or not toc_p.exists():
        problems.append(f'{key}: MISSING'); continue
    n += 1
    raw = frag_p.read_text()
    fixed = ensure_ids(raw, key)
    if fixed != raw:
        frag_p.write_text(fixed)
    frag = fixed.replace('{{N}}', str(n))
    c = Checker(); c.feed(frag); c.close()
    if c.stack: c.errors.append(f'unclosed: {[t for t, _ in c.stack][:8]}')
    bad_ids = [i for i in c.ids if not i.startswith(key)]
    if bad_ids: c.errors.append(f'ids without prefix: {bad_ids[:5]}')
    bad_radio = [r for r in c.radios if not (r or '').startswith(key)]
    if bad_radio: c.errors.append(f'radio names without prefix: {bad_radio[:5]}')
    if c.errors: problems.append(f'{key}: ' + '; '.join(c.errors[:6]))
    all_ids += c.ids
    t = json.loads(toc_p.read_text())
    toc.append({'id': t['id'], 'title': t['title'],
                'sections': [(s['id'], s['title']) for s in t['sections']]})
    body_parts.append(f'\n<!-- ============ CHAPTER {n}: {key} ============ -->\n' + frag)

def build_pane(d, label):
    """Chapters of a secondary tab (ielts/, vocab/): own numbering from 1."""
    order_ = json.load(open(d / 'order.json')) if (d / 'order.json').exists() else []
    toc_, parts_, m = [], [], 0
    for key in order_:
        frag_p, toc_p = d / f'fragments/{key}.html', d / f'fragments/{key}.toc.json'
        if not frag_p.exists() or not toc_p.exists():
            problems.append(f'{label}/{key}: MISSING'); continue
        m += 1
        raw = frag_p.read_text()
        fixed = ensure_ids(raw, key)
        if fixed != raw:
            frag_p.write_text(fixed)
        frag = fixed.replace('{{N}}', str(m))
        c = Checker(); c.feed(frag); c.close()
        if c.stack: c.errors.append(f'unclosed: {[t for t, _ in c.stack][:8]}')
        bad_ids = [i for i in c.ids if not i.startswith(key)]
        if bad_ids: c.errors.append(f'ids without prefix: {bad_ids[:5]}')
        if c.errors: problems.append(f'{label}/{key}: ' + '; '.join(c.errors[:6]))
        all_ids.extend(c.ids)
        t = json.loads(toc_p.read_text())
        toc_.append({'id': t['id'], 'title': t['title'], 'sections': [(s_['id'], s_['title']) for s_ in t['sections']]})
        parts_.append(f'\n<!-- ============ {label.upper()} {m}: {key} ============ -->\n' + frag)
    return order_, toc_, parts_

IELTS_DIR, VOCAB_DIR, COLLOC_DIR = SCR / 'ielts', SCR / 'vocab', SCR / 'colloc'
IORDER, itoc, ielts_parts = build_pane(IELTS_DIR, 'ielts')
VORDER, vtoc, vocab_parts = build_pane(VOCAB_DIR, 'vocab')
CORDER, ctoc, colloc_parts = build_pane(COLLOC_DIR, 'colloc')

dup = sorted({i for i in all_ids if all_ids.count(i) > 1})
if dup: problems.append(f'duplicate ids: {dup[:10]}')

NEW_IDS = set()
for _m in re.finditer(r'<section class="card[^"]*" id="([^"]+)"[^>]*>(.*?)</section>', b1, re.S):
    if 'class="new"' in _m.group(2):
        NEW_IDS.add(_m.group(1))
for _f in [SCR / f'fragments/{k}.html' for k in ORDER] + [IELTS_DIR / f'fragments/{k}.html' for k in IORDER] + [VOCAB_DIR / f'fragments/{k}.html' for k in VORDER] + [COLLOC_DIR / f'fragments/{k}.html' for k in CORDER]:
    if _f.exists():
        for _m in re.finditer(r'<section class="card[^"]*" id="([^"]+)"[^>]*>(.*?)</section>', _f.read_text(), re.S):
            if 'class="new"' in _m.group(2):
                NEW_IDS.add(_m.group(1))

VOCAB_GROUPS = {'v-01': 'Nơi chốn & dịch vụ', 'v-09': 'Đời sống & thiên nhiên', 'v-18': 'Con người & cách dùng từ', 'v-24': 'Hội thoại', 'vx-adj': 'Từ vựng nâng cao'}
COLLOC_GROUPS = {'vx-col': 'Collocations', 'phr': 'Phrasal verbs', 'v-23': 'Thành ngữ (Idioms)'}
IELTS_GROUPS = {'sk': 'Speaking', 'ph-01': 'Mẫu câu giao tiếp', 'cs-social': 'Giao tiếp theo tình huống', 't1': 'Writing', 'misc': 'Khác'}

def nav_html(tocs, pane, brand, placeholder, groups=None, about=True):
    out = [f'<nav class="toc" data-pane="{pane}">', f'  <div class="brand">{brand}</div>',
           '  <button class="tocToggle" type="button">☰ Mục lục &amp; tìm kiếm</button>', '  <div class="inner">',
           f'  <div class="search-wrap"><input class="search" type="search" placeholder="{placeholder}" autocomplete="off"><kbd>/</kbd></div>',
           '  <ul class="results"></ul>']
    for i, ch in enumerate(tocs, 1):
        if groups and ch['id'] in groups:
            out.append(f'  <div class="navgroup">{groups[ch["id"]]}</div>')
        mark = ' 🆕' if any(sid in NEW_IDS for sid, _ in ch['sections']) else ''
        out.append(f'  <details><summary><a href="#{ch["id"]}">{i}. {html.escape(ch["title"])}{mark}</a></summary><ol>')
        out += [f'    <li><a href="#{sid}">{"🆕 " if sid in NEW_IDS else ""}{html.escape(st)}</a></li>' for sid, st in ch['sections']]
        out.append('  </ol></details>')
    if about:
        out.append('  <details open><summary><a href="#about">Về tài liệu này</a></summary></details>')
    out += ['  </div>', '</nav>']
    return '\n'.join(out)

tabbar = """<div class="tabbar"><div class="in">
  <button type="button" class="tab active" data-tab="grammar">📘 Ngữ pháp</button>
  <button type="button" class="tab" data-tab="ielts">🎤 IELTS</button>
  <button type="button" class="tab" data-tab="vocab">📚 Từ vựng</button>
  <button type="button" class="tab" data-tab="colloc">🧩 Cụm từ &amp; Thành ngữ</button>
  <span class="tools">
    <button type="button" id="themeBtn">🌓 Sáng/tối</button>
    <button type="button" id="expandAll">📂 Mục lục</button>
    <button type="button" id="newBtn">🆕 Mục mới</button>
    <button type="button" id="speakBtn">🔊 Nghe: bật</button>
    <button type="button" id="fixBtn" title="Ẩn / hiện các nhãn ✎ sửa, ✎ bổ sung (chỗ nguồn bị lỗi đã được sửa)">✎ Ghi chú: ẩn</button>
    <button type="button" id="editBtn">✏️ Chế độ sửa</button>
    <button type="button" id="saveBtn" hidden>💾 Lưu bản sửa</button>
    <button type="button" onclick="window.print()">🖨️ In</button>
  </span>
</div></div>
"""

hero = f"""<header class="hero">
  <h1>Sổ tay Ngữ pháp Tiếng Anh</h1>
  <p><strong>{len(toc)} chương</strong> tổng hợp từ toàn bộ 246 trang trong bộ ghi chú Notion “English grammar”, gồm cả chữ và nội dung trong 485 ảnh ghi chú, được gom lại theo chủ đề và bỏ các bài trùng lặp.</p>
  <p>Chỗ nào có nhãn <span class="fix">✎ sửa</span> là chỗ nguồn gốc bị lỗi và đã được sửa; <span class="fix">✎ bổ sung</span> là phần thêm vào để lấp chỗ trống.</p>
</header>
"""

n_sp = sum(len(c['sections']) for c in itoc if c['id'].startswith('sp-'))
ielts_hero = f"""<header class="hero">
  <h1>IELTS Speaking &amp; Writing</h1>
  <p><strong>{len(itoc)} chương</strong>: kỹ năng Speaking, {n_sp} câu hỏi &amp; câu trả lời mẫu chia theo chủ đề, kỹ năng Writing Task 1 / Task 2 và bài mẫu.</p>
  <p>Mỗi câu trả lời mẫu: bấm <b>🇻🇳 Bản dịch</b> để xem nghĩa, <b>📚 Từ vựng</b> để xem từ / cụm hay. Rê chuột lên câu tiếng Anh rồi bấm 🔊 để nghe.</p>
</header>
"""

n_vocab = sum(int(m_.group(1)) for c_ in vtoc for _, t_ in c_['sections'] for m_ in [re.search(r'\((\d+)\)$', t_)] if m_)
vocab_hero = f"""<header class="hero">
  <h1>Từ vựng theo chủ đề</h1>
  <p><strong>{len(vtoc)} chương · {sum(len(c_['sections']) for c_ in vtoc)} bối cảnh · {n_vocab:,} từ / cụm từ</strong> — từ sheet “group” trong Vocabulary-new.xlsx: sân bay, giao thông, ăn uống, nhà cửa, thiên nhiên, con người, từ dễ nhầm và tình huống đời sống hằng ngày.</p>
  <p>Tìm nhanh bằng ô tìm kiếm bên trái (gõ tiếng Anh hoặc tiếng Việt, không cần dấu). Rê chuột lên từ tiếng Anh rồi bấm 🔊 để nghe.</p>
</header>
"""

colloc_hero = f"""<header class="hero">
  <h1>Cụm từ &amp; Thành ngữ</h1>
  <p><strong>{len(ctoc)} chương · {sum(len(c_['sections']) for c_ in ctoc)} mục</strong>: collocations (từ hay đi cùng nhau), cụm động từ (phrasal verbs) và thành ngữ (idioms) — những cụm phải học nguyên khối, không dịch từng chữ.</p>
  <p>Tìm nhanh bằng ô tìm kiếm bên trái. Rê chuột lên cụm tiếng Anh rồi bấm 🔊 để nghe.</p>
</header>
"""

about = """
<h2 class="chapter" id="about">Về tài liệu này</h2>
<section class="card">
  <p>Nguồn: bộ ghi chú Notion <a href="https://phuongdocs.notion.site/14c00a84968880f499dbe6f1bfbf1f53">English grammar</a> (246 trang, 12 chế độ xem). Mỗi chương có thẻ <b>Nguồn</b> riêng liệt kê các trang đã dùng.</p>
  <p>Các bài viết dài (ELSA Speak, ZIM, 7ESL…) được tóm tắt lại theo chủ đề, không chép nguyên văn. Ảnh trang trí / quảng cáo trong các bài viết đó không được dùng.</p>
</section>
"""

extra_js = """
<script>
(function () {
  function fold(s) { return s.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/đ/g, 'd'); }
  var panes = {};
  document.querySelectorAll('.layout[data-pane]').forEach(function (p) {
    var name = p.dataset.pane, nav = p.querySelector('nav.toc');
    var q = nav.querySelector('.search'), res = nav.querySelector('.results');
    var index = null;          // built lazily: folding the text of every card costs ~0.3 s
    function buildIndex() {
      ensurePane(name, true);
      if (index) return index;
      var chap = '';
      index = [];
      p.querySelectorAll('main h2.chapter, main section.card').forEach(function (el) {
        if (el.tagName === 'H2') { chap = el.textContent.replace('🆕', '').trim().replace(/^(\\d+)(?=\\D)/, '$1. '); return; }
        var h = el.querySelector('h3');
        index.push({ id: el.id, chap: chap, title: h ? h.textContent.replace('🆕', '').trim() : el.id, f: fold(el.textContent) });
      });
      return index;
    }
    q.addEventListener('focus', function () { setTimeout(buildIndex, 0); }, { once: true });
    var searchT = null;
    function runSearch() {
      var v = fold(q.value.trim()); res.innerHTML = '';
      if (v.length < 2) return;
      var all = buildIndex().filter(function (x) { return x.f.indexOf(v) !== -1; });
      if (!all.length) { res.innerHTML = '<li class="none">Không tìm thấy</li>'; return; }
      var head = document.createElement('li'); head.className = 'count';
      head.textContent = all.length > 50 ? all.length + ' kết quả (hiện 50)' : all.length + ' kết quả';
      res.appendChild(head);
      all.slice(0, 50).forEach(function (x, i) {
        var li = document.createElement('li'), a = document.createElement('a'), sm = document.createElement('small');
        a.href = '#' + x.id; a.textContent = x.title; if (!i) a.className = 'first';
        sm.textContent = x.chap; a.appendChild(sm); li.appendChild(a); res.appendChild(li);
      });
    }
    q.addEventListener('input', function () { nav.dataset.mode = ''; document.getElementById('newBtn').classList.remove('primary'); clearTimeout(searchT); searchT = setTimeout(runSearch, 120); });
    q.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { clearTimeout(searchT); runSearch(); var a = res.querySelector('a'); if (a) { location.hash = a.getAttribute('href'); q.blur(); } }
      else if (e.key === 'Escape') { q.value = ''; res.innerHTML = ''; q.blur(); }
    });
    nav.querySelector('.tocToggle').addEventListener('click', function () { nav.classList.toggle('open'); });
    nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') nav.classList.remove('open'); });
    panes[name] = { el: p, nav: nav, q: q, res: res, cards: [], scroll: 0, ready: false };
  });
  // secondary tabs arrive as inert text chunks (script type text/html) and are parsed the first time they are needed
  var LAZY = window.__LAZY_IDS || {}, lazyOf = {};
  Object.keys(LAZY).forEach(function (n) { LAZY[n].forEach(function (id) { lazyOf[id] = n; }); });
  function ensurePane(name, full) {                   // full = every chunk now (search, jump, save, edit)
    var P = panes[name]; if (!P || P.ready) return;
    var m = P.el.querySelector('main');
    var srcs = Array.prototype.slice.call(document.querySelectorAll('script[data-lazy-pane="' + name + '"]'));
    function take() {
      var src = srcs.shift(); if (!src) return false;
      m.insertAdjacentHTML('beforeend', src.textContent.split('<\\\\/script').join('<\\/script').split('<\\\\!--').join('<!--'));
      src.remove(); return true;
    }
    function finish() {
      if (P.ready) return;
      m.removeAttribute('data-lazy');
      P.cards = Array.prototype.slice.call(P.el.querySelectorAll('main section.card'));
      P.cards.forEach(function (c, i) { if (!c.id) c.id = name + '-card-' + i; });
      P.ready = true; P.building = false;
      if (window.__spy) window.__spy(name);
      if (document.body.classList.contains('editing')) m.contentEditable = 'true';
      if (name === active && typeof refreshNew === 'function') refreshNew();
    }
    if (full || !srcs.length) { while (take()) {} finish(); return; }
    if (P.building) return;
    P.building = true; take();                           // first chunk now → the tab shows at once
    (function step() {
      if (P.ready) return;
      if (take()) setTimeout(step, 0); else finish();
    })();
  }
  function ensureAll() { Object.keys(panes).forEach(function (n) { ensurePane(n, true); }); }
  var active = 'grammar';
  function showTab(name, keepScroll) {
    if (!panes[name]) return;
    ensurePane(name);
    if (panes[active]) panes[active].scroll = window.scrollY;
    Object.keys(panes).forEach(function (k) { panes[k].el.hidden = (k !== name); });
    document.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('active', t.dataset.tab === name); });
    active = name;
    try { localStorage.setItem('tab', name); } catch (e) {}
    if (!keepScroll) window.scrollTo(0, panes[name].scroll || 0);
    refreshNew();
  }
  document.querySelectorAll('.tab').forEach(function (t) { t.addEventListener('click', function () { showTab(t.dataset.tab); }); });
  function paneOf(id) {
    if (!id) return null;
    try { id = decodeURIComponent(id); } catch (e) {}
    var el = document.getElementById(id), p = el && el.closest('.layout[data-pane]');
    return p ? p.dataset.pane : (lazyOf[id] || null);
  }
  function jumpTo(id) {                    // the target was in a hidden/lazy pane, so the browser could not scroll to it
    var el = document.getElementById(id); if (!el) return;
    var root = document.documentElement, userMoved = false;
    root.style.scrollBehavior = 'auto';    // no smooth animation aiming at estimated card heights
    function snap() { if (!userMoved) el.scrollIntoView({ block: 'start' }); }
    function stop() { userMoved = true; }
    snap();
    ['wheel', 'touchstart', 'keydown'].forEach(function (ev) { window.addEventListener(ev, stop, { once: true, passive: true }); });
    requestAnimationFrame(snap);                                   // cards above get real heights → correct again
    [120, 400, 900].forEach(function (t) { setTimeout(snap, t); });
    setTimeout(function () { root.style.scrollBehavior = ''; }, 1000);
  }
  window.addEventListener('hashchange', function () {
    var id = location.hash.slice(1), n = paneOf(id);
    if (n && n !== active) { ensurePane(n, true); showTab(n, true); jumpTo(id); }
    else if (n && !document.getElementById(id)) { ensurePane(n, true); jumpTo(id); }
  });
  var start = paneOf(location.hash.slice(1));
  if (!start) { try { start = localStorage.getItem('tab'); } catch (e) {} }
  // back to the table of contents: clear the 🆕 list / search results that sit above it
  function showToc(P) {
    P.res.innerHTML = ''; P.q.value = ''; P.nav.dataset.mode = '';
    P.nav.scrollTop = 0; newBtn.classList.remove('primary');
    if (matchMedia('(min-width: 901px)').matches) P.nav.scrollIntoView({ block: 'nearest' });
  }
  document.getElementById('expandAll').addEventListener('click', function () {
    var P = panes[active];
    if (P.res.children.length) { showToc(P); P.nav.classList.add('open'); return; }   // first click: return to the TOC
    var all = P.nav.querySelectorAll('details'); var open = !all[0].open;
    all.forEach(function (d) { d.open = open; });
  });
  var editBtn = document.getElementById('editBtn'), saveBtn = document.getElementById('saveBtn');
  var dirty = false;
  function setDirty(v) { dirty = v; saveBtn.classList.toggle('dirty', v); saveBtn.textContent = v ? '💾 Lưu bản sửa •' : '💾 Lưu bản sửa'; }
  editBtn.addEventListener('click', function () {
    var on = !document.body.classList.contains('editing');
    document.body.classList.toggle('editing', on);
    if (on) ensurePane(active, true);
    document.querySelectorAll('main').forEach(function (m) { m.contentEditable = on ? 'true' : 'false'; });
    saveBtn.hidden = !on && !dirty;
    editBtn.textContent = on ? '✅ Thoát chế độ sửa' : '✏️ Chế độ sửa';
    if (!on) tblTools.hidden = true;
  });
  document.querySelectorAll('main').forEach(function (m) {
    m.addEventListener('input', function () { if (document.body.classList.contains('editing')) setDirty(true); });
  });
  window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 's' && (dirty || document.body.classList.contains('editing'))) { e.preventDefault(); saveBtn.click(); }
  });

  // ✏️ table tools (edit mode): add / delete rows and columns of the table the caret is in
  var tblTools = document.createElement('div');
  tblTools.id = 'tblTools'; tblTools.hidden = true; tblTools.contentEditable = 'false';
  tblTools.innerHTML = '<button type="button" data-act="rowAbove" title="Thêm hàng phía trên">⬆︎ + Hàng</button>' +
    '<button type="button" data-act="rowBelow" title="Thêm hàng phía dưới">⬇︎ + Hàng</button>' +
    '<span class="sep"></span>' +
    '<button type="button" data-act="colLeft" title="Thêm cột bên trái">⬅︎ + Cột</button>' +
    '<button type="button" data-act="colRight" title="Thêm cột bên phải">➡︎ + Cột</button>' +
    '<span class="sep"></span>' +
    '<button type="button" class="del" data-act="delRow" title="Xoá hàng này">🗑 Hàng</button>' +
    '<button type="button" class="del" data-act="delCol" title="Xoá cột này">🗑 Cột</button>';
  document.body.appendChild(tblTools);
  var curCell = null;
  function placeTools() {
    if (!curCell || !curCell.isConnected) { tblTools.hidden = true; return; }
    var box = (curCell.closest('.tbl') || curCell.closest('table')).getBoundingClientRect();
    tblTools.hidden = false;
    var top = box.top - tblTools.offsetHeight - 4;
    if (top < 60) top = box.bottom + 4;
    tblTools.style.top = (window.scrollY + top) + 'px';
    tblTools.style.left = (window.scrollX + Math.max(8, Math.min(box.left, document.documentElement.clientWidth - tblTools.offsetWidth - 8))) + 'px';
  }
  document.addEventListener('selectionchange', function () {
    if (!document.body.classList.contains('editing')) return;
    var s = getSelection(), n = s.anchorNode;
    var cell = n && (n.nodeType === 1 ? n : n.parentElement).closest('main td, main th');
    if (cell) { curCell = cell; placeTools(); }
  });
  window.addEventListener('scroll', function () { if (!tblTools.hidden) placeTools(); }, { passive: true });
  function blankCell(like, tag) {                  // same class as a neighbour cell (.en is added on save)
    var c = document.createElement(tag || like.tagName);
    if (like.className) c.className = like.className;
    return c;
  }
  function focusCell(c) {
    var r = document.createRange();
    r.selectNodeContents(c); r.collapse(true);
    var s = getSelection(); s.removeAllRanges(); s.addRange(r); curCell = c; placeTools();
  }
  function tableRows(tbl) { return Array.prototype.slice.call(tbl.rows); }
  tblTools.addEventListener('mousedown', function (e) { e.preventDefault(); });   // keep the caret in the table
  tblTools.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || !curCell) return;
    var tr = curCell.parentElement, tbl = curCell.closest('table'), col = curCell.cellIndex, act = b.dataset.act;
    var rows = tableRows(tbl), focus = null;
    if (act === 'rowAbove' || act === 'rowBelow') {
      var model = rows.filter(function (r) { return r.querySelector('td'); })[0] || tr;   // a data row, not the header
      var nr = document.createElement('tr');
      Array.prototype.forEach.call(model.cells, function (c) { nr.appendChild(blankCell(c, 'td')); });
      var below = act === 'rowBelow' || tr.querySelector('th') && !tr.querySelector('td');
      tr.parentNode.insertBefore(nr, below ? tr.nextSibling : tr);
      focus = nr.cells[Math.min(col, nr.cells.length - 1)] || nr.cells[0];
    } else if (act === 'colLeft' || act === 'colRight') {
      var at = act === 'colRight' ? col + 1 : col;
      rows.forEach(function (r) {
        var ref = r.cells[Math.min(col, r.cells.length - 1)];
        var c = document.createElement(ref && ref.tagName === 'TH' ? 'th' : 'td');
        if (c.tagName === 'TH') c.textContent = 'Cột mới';
        r.insertBefore(c, r.cells[at] || null);
        if (r === tr) focus = c;
      });
    } else if (act === 'delRow') {
      if (rows.length <= 1) return;
      var next = tr.nextElementSibling || tr.previousElementSibling;
      tr.remove(); focus = next && next.cells[Math.min(col, next.cells.length - 1)];
    } else if (act === 'delCol') {
      if (tr.cells.length <= 1) return;
      rows.forEach(function (r) { if (r.cells[col]) r.cells[col].remove(); });
      focus = tr.cells[Math.min(col, tr.cells.length - 1)];
    }
    setDirty(true);
    if (focus) focusCell(focus); else { curCell = null; tblTools.hidden = true; }
  });

  saveBtn.addEventListener('click', function () {
    ensureAll();
    var d = document.documentElement.cloneNode(true);
    d.querySelectorAll('script[type="text/html"]').forEach(function (x) { x.remove(); });
    d.querySelectorAll('p.xref').forEach(function (x) { x.remove(); });   // generated at build time, not source
    var tt = d.querySelector('#tblTools'); if (tt) tt.remove();
    // sources have no <tbody> (the browser adds it) — unwrap it so sync_back only sees real edits
    d.querySelectorAll('main tbody').forEach(function (tb) { while (tb.firstChild) tb.parentNode.insertBefore(tb.firstChild, tb); tb.remove(); });
    d.querySelectorAll('main td > br:only-child, main th > br:only-child').forEach(function (br) { br.remove(); });
    // text typed straight into a new vocab cell → wrap it in .en like the rest of the column (so 🔊 works)
    d.querySelectorAll('main table').forEach(function (tb) {
      var rows = Array.prototype.slice.call(tb.rows), enCols = {};
      rows.forEach(function (r) { Array.prototype.forEach.call(r.cells, function (c, i) { if (c.querySelector(':scope > .en')) enCols[i] = true; }); });
      rows.forEach(function (r) { Array.prototype.forEach.call(r.cells, function (c, i) {
        if (enCols[i] && c.tagName === 'TD' && !c.children.length && c.textContent.trim()) {
          var sp = document.createElement('span'); sp.className = 'en'; sp.textContent = c.textContent.trim();
          c.textContent = ''; c.appendChild(sp);
        }
      }); });
    });
    d.removeAttribute('data-theme');
    d.querySelectorAll('main').forEach(function (m) { m.removeAttribute('contenteditable'); });
    d.querySelectorAll('.layout[data-pane]').forEach(function (p) { p.hidden = (p.dataset.pane !== 'grammar'); });
    d.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('active', t.dataset.tab === 'grammar'); });
    d.querySelectorAll('nav.toc').forEach(function (n) { n.classList.remove('open'); });
    d.querySelector('body').classList.remove('editing', 'speak-on', 'hide-fix');
    d.querySelectorAll('.speaking, .spk-target').forEach(function (e) { e.classList.remove('speaking', 'spk-target'); });
    var sp = d.querySelector('#spk'); if (sp) sp.remove();
    d.querySelectorAll('.ok, .bad').forEach(function (e) { e.classList.remove('ok', 'bad'); });
    d.querySelectorAll('.show-ans').forEach(function (e) { e.classList.remove('show-ans'); });
    d.querySelectorAll('[class=""]').forEach(function (e) { e.removeAttribute('class'); });
    d.querySelectorAll('.score').forEach(function (e) { e.textContent = ''; });
    d.querySelectorAll('details').forEach(function (e) { e.removeAttribute('open'); });
    d.querySelectorAll('.results').forEach(function (r) { r.innerHTML = ''; });
    d.querySelectorAll('.search').forEach(function (i) { i.removeAttribute('value'); });
    var t = d.querySelector('#toTop'); if (t) t.remove();
    var sb = d.querySelector('#saveBtn'); sb.hidden = true; sb.classList.remove('dirty'); sb.textContent = '💾 Lưu bản sửa';
    d.querySelector('#editBtn').textContent = '✏️ Chế độ sửa';
    var blob = new Blob(['<!DOCTYPE html>\\n' + d.outerHTML], { type: 'text/html' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'english-grammar-edited.html'; a.click();
    setDirty(false); if (!document.body.classList.contains('editing')) saveBtn.hidden = true;
    alert('Đã tải về english-grammar-edited.html.\\nChạy: python3 sync_back.py ~/Downloads/english-grammar-edited.html\\nđể chép phần sửa về file nguồn.');
  });
  // 🆕 list of new, not-yet-reviewed cards
  var newBtn = document.getElementById('newBtn');
  function newCardsOf(name) { return panes[name].cards.filter(function (c) { return c.querySelector('.new'); }); }
  function refreshNew() {
    var n = newCardsOf(active).length;
    newBtn.textContent = '🆕 Mục mới (' + n + ')'; newBtn.hidden = !n;
    newBtn.classList.toggle('primary', panes[active].nav.dataset.mode === 'new');
  }
  newBtn.addEventListener('click', function () {
    var P = panes[active], res = P.res, newCards = newCardsOf(active);
    if (P.nav.dataset.mode === 'new') { showToc(P); return; }                           // second click closes the list
    res.innerHTML = ''; P.q.value = ''; P.nav.dataset.mode = 'new'; newBtn.classList.add('primary');
    var head = document.createElement('li'); head.className = 'count';
    var back = document.createElement('button'); back.type = 'button'; back.className = 'backToc'; back.textContent = '✕ Quay lại mục lục';
    back.addEventListener('click', function () { showToc(P); });
    head.appendChild(document.createTextNode(newCards.length + ' mục mới ')); head.appendChild(back); res.appendChild(head);
    var chap = '', chapOf = new Map();
    P.el.querySelectorAll('main h2.chapter, main section.card').forEach(function (el) {
      if (el.tagName === 'H2') chap = el.textContent.replace('🆕', '').trim().replace(/^(\d+)(?=\D)/, '$1. '); else chapOf.set(el, chap);
    });
    newCards.forEach(function (c) {
      var li = document.createElement('li'), a = document.createElement('a'), h = c.querySelector('h3'), sm = document.createElement('small');
      a.href = '#' + c.id; a.textContent = '🆕 ' + (h ? h.textContent.replace('🆕', '').replace('✎ bổ sung', '').trim() : c.id);
      sm.textContent = chapOf.get(c) || ''; a.appendChild(sm);
      li.appendChild(a); res.appendChild(li);
    });
    P.nav.scrollTop = 0; P.nav.classList.add('open'); P.q.scrollIntoView({ block: 'nearest' });
  });

  // ✎ correction notes: hidden by default (cleaner reading), remembered per browser
  var fixBtn = document.getElementById('fixBtn'), showFix = false;
  try { showFix = localStorage.getItem('fix') === 'show'; } catch (e) {}
  function setFix(on) {
    showFix = on; document.body.classList.toggle('hide-fix', !on);
    fixBtn.textContent = on ? '✎ Ghi chú: hiện' : '✎ Ghi chú: ẩn';
    try { localStorage.setItem('fix', on ? 'show' : 'hide'); } catch (e) {}
  }
  setFix(showFix);
  fixBtn.addEventListener('click', function () { setFix(!showFix); });
  // 🔊 click English text to hear it (browser speech, offline, free)
  var speakOn = true;
  try { speakOn = localStorage.getItem('speak') !== 'off'; } catch (e) {}
  var speakBtn = document.getElementById('speakBtn');
  function setSpeak(on) {
    speakOn = on; document.body.classList.toggle('speak-on', on);
    speakBtn.textContent = on ? '🔊 Nghe: bật' : '🔇 Nghe: tắt';
    var b = document.getElementById('spk'); if (b && !on) b.hidden = true;
    try { localStorage.setItem('speak', on ? 'on' : 'off'); } catch (e) {}
  }
  if (!('speechSynthesis' in window)) { speakBtn.hidden = true; speakOn = false; }
  setSpeak(speakOn);
  speakBtn.addEventListener('click', function () { setSpeak(!speakOn); });
  var voice = null;
  function pickVoice() {
    var vs = speechSynthesis.getVoices();
    voice = vs.find(function (v) { return /en[-_]US/i.test(v.lang) && /Samantha|Google|Natural|Aria|Jenny/i.test(v.name); }) ||
            vs.find(function (v) { return /^en/i.test(v.lang); }) || null;
  }
  if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  // hover an example → a 🔊 bubble appears after it; click the bubble to hear it (tap text first on touch screens)
  var SEL = '.en, .ex b, .words';
  var mains = document.querySelectorAll('main');
  var spk = document.createElement('button');
  spk.id = 'spk'; spk.type = 'button'; spk.textContent = '🔊'; spk.hidden = true;
  spk.title = 'Nghe (Shift + bấm: đọc chậm)';
  document.body.appendChild(spk);
  var cur = null, hideT = null;
  function place(el) {
    var rs = el.getClientRects(); if (!rs.length) return;
    var r = rs[rs.length - 1];
    var left = Math.min(r.right + 4, document.documentElement.clientWidth - 34);
    spk.style.left = (window.scrollX + left) + 'px';
    spk.style.top = (window.scrollY + r.top + r.height / 2 - 13) + 'px';
  }
  function show(el) {
    if (!speakOn || document.body.classList.contains('editing')) return;
    clearTimeout(hideT);
    if (cur && cur !== el) cur.classList.remove('spk-target');
    cur = el; el.classList.add('spk-target'); place(el); spk.hidden = false;
  }
  function hideSoon() {
    clearTimeout(hideT);
    hideT = setTimeout(function () { spk.hidden = true; if (cur) cur.classList.remove('spk-target'); cur = null; }, 350);
  }
  mains.forEach(function (mainNode) {
    mainNode.addEventListener('mouseover', function (e) {
      var el = e.target.closest(SEL);
      if (el && !e.target.closest('input')) show(el);
    });
    mainNode.addEventListener('mouseout', function (e) {
      var el = e.target.closest(SEL);
      if (el && !(e.relatedTarget && (el.contains(e.relatedTarget) || e.relatedTarget === spk))) hideSoon();
    });
  });
  spk.addEventListener('mouseenter', function () { clearTimeout(hideT); });
  spk.addEventListener('mouseleave', hideSoon);
  if (matchMedia('(hover: none)').matches) {          // phones/tablets: tap the text to show the bubble
    mains.forEach(function (mainNode) { mainNode.addEventListener('click', function (e) {
      var el = e.target.closest(SEL);
      if (el && !e.target.closest('input, a')) show(el);
    }); });
  }
  window.addEventListener('scroll', function () { if (cur && !spk.hidden) place(cur); }, { passive: true });
  spk.addEventListener('click', function (e) {
    if (!cur) return;
    var el = cur, c = el.cloneNode(true);
    c.querySelectorAll('.fix, .vi, .ipa, .new, s').forEach(function (x) { x.remove(); });
    var text = c.textContent.replace(/[|↗↘·→=]/g, ', ').replace(/\\s+/g, ' ').trim().toLowerCase();
    if (!text) return;
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = e.shiftKey ? 0.6 : 0.9; if (voice) u.voice = voice;
    el.classList.add('speaking'); spk.classList.add('on');
    u.onend = u.onerror = function () { el.classList.remove('speaking'); spk.classList.remove('on'); };
    speechSynthesis.speak(u);
  });

  // "/" focuses the search box of the current tab
  document.addEventListener('keydown', function (e) {
    if (e.key !== '/' || e.metaKey || e.ctrlKey || e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    e.preventDefault(); var P = panes[active]; P.nav.classList.add('open'); P.q.focus();
  });
  // highlight the TOC entry of the card being read
  window.__spy = function (name) {
    if (!('IntersectionObserver' in window)) return;
    var P = panes[name], links = {}, curA = null, autoOpen = null;
    P.nav.querySelectorAll('.inner a[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target, a = links[el.id];
        if (!a && el.tagName === 'SECTION') { var h = el.previousElementSibling; while (h && h.tagName !== 'H2') h = h.previousElementSibling; a = h && links[h.id]; }
        if (!a || a === curA) return;
        if (curA) curA.classList.remove('current');
        curA = a; a.classList.add('current');
        var det = a.closest('details');
        if (autoOpen && autoOpen !== det) { autoOpen.open = false; autoOpen = null; }   // close what we opened before
        if (det && !det.open) { det.open = true; autoOpen = det; }
        var nr = P.nav.getBoundingClientRect(), ar = a.getBoundingClientRect();
        if (ar.top < nr.top + 40 || ar.bottom > nr.bottom - 20) P.nav.scrollTop += ar.top - nr.top - nr.height / 3;
      });
    }, { rootMargin: '-70px 0px -70% 0px' });
    P.el.querySelectorAll('main h2.chapter[id], main section.card[id]').forEach(function (el) { io.observe(el); });
  };
  Object.keys(panes).forEach(function (n) { if (!panes[n].el.querySelector('main[data-lazy]')) ensurePane(n); });

  var startId = location.hash.slice(1);
  if (paneOf(startId) && lazyOf[startId]) ensurePane(lazyOf[startId], true);
  showTab(start && panes[start] ? start : 'grammar', !!paneOf(location.hash.slice(1)));
  if (paneOf(location.hash.slice(1))) jumpTo(location.hash.slice(1));
  var top = document.createElement('button'); top.id = 'toTop'; top.type = 'button'; top.textContent = '↑';
  top.title = 'Lên đầu trang'; top.onclick = function () { scrollTo(0, 0); }; document.body.appendChild(top);
})();
</script>"""

# exercises: one delegated handler (works for cards added later, e.g. lazily built tabs; no crash if a button is missing)
_ex_start = script.index("  document.querySelectorAll('.exercise').forEach(function (ex) {")
_ex_end = script.index("\n  });\n", script.index("ex.querySelector('.reveal')")) + len("\n  });\n")
script = script[:_ex_start] + """  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.exercise .check, .exercise .reveal');
    if (!btn) return;
    var ex = btn.closest('.exercise');
    if (btn.classList.contains('check')) {
      var right = 0, total = 0;
      ex.querySelectorAll('input[type=text]').forEach(function (inp) {
        total++;
        var ok = (inp.dataset.a || '').split('|').indexOf(norm(inp.value)) !== -1;
        inp.classList.toggle('ok', ok); inp.classList.toggle('bad', !ok);
        if (ok) right++;
      });
      ex.querySelectorAll('.q[data-a]').forEach(function (q) {
        total++;
        var picked = q.querySelector('input:checked');
        q.querySelectorAll('label').forEach(function (l) { l.classList.remove('ok', 'bad'); });
        if (!picked) return;
        var ok = picked.value === q.dataset.a;
        picked.parentElement.classList.add(ok ? 'ok' : 'bad');
        if (ok) right++;
      });
      var sc = ex.querySelector('.score'); if (sc) sc.textContent = 'Đúng ' + right + ' / ' + total;
    } else {
      ex.classList.toggle('show-ans');
      ex.querySelectorAll('.q[data-a]').forEach(function (q) {
        var inp = q.querySelector('input[value="' + q.dataset.a + '"]');
        if (inp) inp.parentElement.classList.add('ok');
      });
    }
  });
""" + script[_ex_end:]

script = script.replace("""  var toc = document.getElementById('toc');
  document.getElementById('tocToggle').addEventListener('click', function () { toc.classList.toggle('open'); });
  toc.addEventListener('click', function (e) { if (e.target.tagName === 'A') toc.classList.remove('open'); });""", '')

# ---- cross-tab "Xem thêm" links (render-time only, never written back to the sources)
import xref
_XS = {'grammar': [BATCH1] + [SCR / f'fragments/{k}.html' for k in ORDER],
       'ielts': [IELTS_DIR / f'fragments/{k}.html' for k in IORDER],
       'vocab': [VOCAB_DIR / f'fragments/{k}.html' for k in VORDER],
       'colloc': [COLLOC_DIR / f'fragments/{k}.html' for k in CORDER]}
XREFS = xref.compute(_XS)
chapters_1_4, ex_part = xref.inject(chapters_1_4, XREFS), xref.inject(ex_part, XREFS)
body_parts = [xref.inject(x, XREFS) for x in body_parts]
ielts_parts = [xref.inject(x, XREFS) for x in ielts_parts]
vocab_parts = [xref.inject(x, XREFS) for x in vocab_parts]
colloc_parts = [xref.inject(x, XREFS) for x in colloc_parts]

LAZY_IDS = {}
def lazy_main(name, parts):
    """Secondary tabs ship their <main> as inert text chunks (not parsed as HTML); the page builds them on first
    open — the first chunk at once, the rest over the next frames, so the tab appears immediately."""
    parts = [re.sub(r'<!--.*?-->', '', x, flags=re.S) for x in parts]      # comments would confuse <script> parsing
    LAZY_IDS[name] = sorted(set(re.findall(r'\bid="([^"]+)"', ''.join(parts))))
    chunks, cur = [], ''
    for x in parts:
        if cur and len(cur) + len(x) > 200_000: chunks.append(cur); cur = ''
        cur += x
    if cur: chunks.append(cur)
    esc = lambda c: c.replace('</script', '<\\/script').replace('<!--', '<\\!--')
    return (f'\n\n<main data-lazy="{name}"></main>\n' +
            ''.join(f'<script type="text/html" data-lazy-pane="{name}">{esc(c)}</script>\n' for c in chunks) + '</div>\n\n')

page = (head + '<body>\n' + tabbar +
        '<div class="layout" data-pane="grammar">\n' +
        nav_html(toc, 'grammar', '📘 Sổ tay Ngữ pháp', 'Tìm: would rather, đảo ngữ…') +
        '\n\n<main>\n' + hero + '\n' + chapters_1_4 + ex_part + old_sources + ''.join(body_parts) + about +
        '</main>\n</div>\n\n' +
        '<div class="layout" data-pane="ielts" hidden>\n' +
        nav_html(itoc, 'ielts', '🎤 IELTS', 'Tìm: travel, cue card, trend…', IELTS_GROUPS, about=False) +
        lazy_main('ielts', [ielts_hero] + ielts_parts) +
        '<div class="layout" data-pane="vocab" hidden>\n' +
        nav_html(vtoc, 'vocab', '📚 Từ vựng theo chủ đề', 'Tìm: runway, gia vị, mưa phùn…', VOCAB_GROUPS, about=False) +
        lazy_main('vocab', [vocab_hero] + vocab_parts) +
        '<div class="layout" data-pane="colloc" hidden>\n' +
        nav_html(ctoc, 'colloc', '🧩 Cụm từ & Thành ngữ', 'Tìm: make a decision, give up, break a leg…', COLLOC_GROUPS, about=False) +
        lazy_main('colloc', [colloc_hero] + colloc_parts) +
        '<script>window.__LAZY_IDS=' + json.dumps(LAZY_IDS, separators=(',', ':')) + ';</script>\n' +
        script + extra_js + '\n</body>\n</html>\n')
OUT.write_text(page)

# ---- topic index: one line per section card, so Claude can place new content without reading chapters
def build_index():
    idx = []
    sources = [('batch1.html', b1, None)] + [(f'fragments/{k}.html', (SCR / f'fragments/{k}.html').read_text(), k)
                                              for k in ORDER if (SCR / f'fragments/{k}.html').exists()] + \
              [(f'ielts/fragments/{k}.html', (IELTS_DIR / f'fragments/{k}.html').read_text(), k)
               for k in IORDER if (IELTS_DIR / f'fragments/{k}.html').exists()] + \
              [(f'vocab/fragments/{k}.html', (VOCAB_DIR / f'fragments/{k}.html').read_text(), k)
               for k in VORDER if (VOCAB_DIR / f'fragments/{k}.html').exists()] + \
              [(f'colloc/fragments/{k}.html', (COLLOC_DIR / f'fragments/{k}.html').read_text(), k)
               for k in CORDER if (COLLOC_DIR / f'fragments/{k}.html').exists()]
    for fname, text, key in sources:
        for m in re.finditer(r'<section class="card[^"]*" id="([^"]+)"[^>]*>(.*?)</section>', text, re.S):
            sid, inner = m.groups()
            h3 = re.search(r'<h3>(.*?)</h3>', inner, re.S)
            title = re.sub(r'<[^>]+>|\{\{N\}\}\.\d+\s*|^\d+\.\d+\s*', '', h3.group(1)).strip() if h3 else sid
            if title.startswith(('Nguồn', 'Luyện tập', 'Bài ')) or 'exercise' in m.group(0)[:60]:
                continue
            terms = re.findall(r'<h4>([^<]{2,40})</', inner) + re.findall(r'<(?:b|strong)>([^<]{2,22})</', inner)
            seen, kw = set(), []
            for t in terms:
                t = html.unescape(t).strip(' :.,–-').lower()
                if t and t not in seen and not t.startswith(('công thức', 'ví dụ', 'lưu ý')):
                    seen.add(t); kw.append(t)
            idx.append(f"{sid} | {html.unescape(title)} | {', '.join(kw[:6])}")
    (SCR / 'index.txt').write_text('# section id | title | keywords  (id prefix = chapter key; c1–c4/b1 = batch1.html)\n' + '\n'.join(idx) + '\n')
    return len(idx)
print(f'index.txt: {build_index()} sections')
print(f'wrote {OUT} ({len(page)//1024} KB), grammar chapters={len(toc)}, ielts chapters={len(itoc)}, vocab chapters={len(vtoc)}, colloc chapters={len(ctoc)}')
print('PROBLEMS:' if problems else 'no problems'); [print(' -', p) for p in problems]
