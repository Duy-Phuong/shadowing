"""Build IELTS-tab phrase chapters from Vocabulary-new.xlsx, sheet "IELTS Speaking All"
(it contains every line of the "ielts", "speaking" and "Topics for ielts speaking" sheets).

Each "★ NN. Group" row → one chapter ielts/fragments/ph-NN.html; each sub-heading → one card with a table
Cụm từ / câu | Nghĩa | Dạng. Group 13 (Part 2 & 3 answer templates, English only) → lists per question type.
Usage: python3 build_excel.py [--dry-run] [--force]
"""
import html, json, re, sys
from collections import OrderedDict, Counter
from pathlib import Path
import openpyxl

HERE = Path(__file__).parent
XLSX = HERE.parent / 'Vocabulary-new.xlsx'
OUT = HERE / 'ielts' / 'fragments'
dry, force = '--dry-run' in sys.argv, '--force' in sys.argv
BADGE = '<span class="new" title="Mới thêm — chưa xem lại">🆕</span>'
VI = re.compile(r'[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]', re.I)
TYPE = {'v': 'động từ', 'n': 'danh từ', 'a': 'tính từ', 'adj': 'tính từ', 'adv': 'trạng từ', 'a + n': 'cụm danh từ',
        'phrase verb': 'cụm động từ', 'phrasal verb': 'cụm động từ', 'idiom': 'thành ngữ'}
SENT_START = re.compile(r"^(i|i'm|i'd|i've|i'll|we|you|it|it's|that|this|there|let|let's|could|would|can|may|shall|"
                        r"please|thank|thanks|do|does|did|are|is|am|have|has|what|how|why|where|when|who|which|"
                        r"don't|sorry|excuse|he|she|they|my|your|so|well|oh|well,)\b", re.I)

S = lambda c: '' if c is None else str(c).strip()
esc = lambda s: html.escape(s, quote=False)


def form_of(name, typ):
    t = TYPE.get(typ.strip().lower())
    if t:
        return t
    n = name.strip()
    if n.endswith('?'):
        return 'câu hỏi'
    if len(n.split()) <= 1:
        return 'từ'
    if SENT_START.match(n) or n.endswith(('.', '!')):
        return 'câu'
    return 'cụm từ'


def is_vi(s):
    return bool(VI.search(s)) and len(VI.findall(s)) >= 2


wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
rows = [(S(r[2]), S(r[3]), S(r[4])) for r in list(wb['IELTS Speaking All'].iter_rows(values_only=True))[2:]
        if len(r) > 4 and S(r[2])]

groups = OrderedDict()
cur = None
for i, (name, typ, desc) in enumerate(rows):
    if name.startswith('★'):
        m = re.match(r'★\s*(\d+)\.\s*(.*)', name)
        cur = groups.setdefault(m.group(1), {'title': m.group(2).strip(), 'cards': OrderedDict()})
        head = None
        continue
    if cur is None:
        continue
    nxt = next((r for r in rows[i + 1:i + 3] if r[0]), ('', '', ''))
    g13 = cur['title'].startswith('Kỹ năng IELTS')
    if g13:
        if re.match(r'^(PART \d|Question Types? \d|[A-H]\. |Từ vựng)', name, re.I) or (
                len(name) < 60 and not name.endswith((',', '.', '?', '!')) and name[:1].isupper() and re.search(
                    r'(Monologue|Expressions?\b|Phrases\b|Types of|Adjectives|Adverbs|Groups|Classes|Words\b|Analysis|'
                    r'Structures|Superlative|Linking|Vague language|Paraphrase|Giving examples|Past Simple|Conditions|'
                    r'Benefits|Agreement|Disagreement|Introducing|Show compari|Using don)', name)):
            head = name.rstrip(':'); cur['cards'].setdefault(head.lower(), [head, []]); continue
        if head is None:
            head = 'Mẫu câu chung'; cur['cards'].setdefault(head.lower(), [head, []])
        if name.endswith(':') or name.lower() in ('linking phrase', 'lead-in phrases', 'pointing phrase', 'liking',
                                                  'starting phrases', 'reason') or (
                re.match(r"^[A-Z][A-Za-z/&' -]{1,28}$", name) and len(name.split()) <= 3 and not desc):
            cur['cards'][head.lower()][1].append(('SUB', name.rstrip(':'), '', ''))
        else:
            cur['cards'][head.lower()][1].append(('ITEM', name, desc, typ))
        continue
    if desc and len(name) < 70 and not re.search(r'[.?!…,]$', name) and re.match(
            r'^(\d+\s+)?(Other |Better |Polite |Useful |Common )?(Ways? to|How to|Phrases|Words|Expressions|Tips)\b', name):
        head = name
        cur['cards'].setdefault(head.lower(), [name if desc.startswith('http') else f'{name} — {desc}', []]); continue
    if not desc:
        if is_vi(name) and head:                       # Vietnamese note under the previous item
            items = cur['cards'][head.lower()][1]
            if items:
                k, n_, d_, t_ = items[-1]; items[-1] = (k, n_, (d_ + ' ' + name).strip(), t_)
            continue
        looks_head = len(name) < 60 and not name.endswith(('.', '?', '!', '…', ','))
        if looks_head and (nxt[2] or name.isupper() or name.endswith(':') or re.match(r'^\d+[.)]', name)):
            head = re.sub(r'^\d+[.)]\s*', '', name).rstrip(':').strip()
            cur['cards'].setdefault(head.lower(), [head, []])
            continue
    if head is None:
        head = 'Chung'; cur['cards'].setdefault(head.lower(), [head, []])
    cur['cards'][head.lower()][1].append(('ITEM', name, desc, typ))

order, total = [], 0
for num, g in groups.items():
    cards = [(h, [it for it in items]) for h, items in g['cards'].values() if any(k == 'ITEM' for k, *_ in items)]
    if not cards:
        continue
    key = f'ph-{num}'
    order.append(key)
    forms, out, secs = Counter(), [], []
    for ci, (head, items) in enumerate(cards, 1):
        seen, clean = set(), []
        for k, n_, d_, t_ in items:
            if k == 'ITEM':
                sig = re.sub(r'[^a-z]', '', n_.lower())
                if sig in seen:
                    continue
                seen.add(sig)
            clean.append((k, n_, d_, t_))
        n_items = sum(1 for k, *_ in clean if k == 'ITEM'); total += n_items
        cid = f'{key}-{ci}'
        secs.append({'id': cid, 'title': f'{head[:50]} ({n_items})'})
        body = [f'<section class="card" id="{cid}">',
                f'  <h3>{{{{N}}}}.{ci} {esc(head)} <span class="part">{n_items}</span>{BADGE}</h3>']
        has_meaning = any(d for k, _, d, _ in clean if k == 'ITEM')
        if has_meaning:
            rows_html = []
            for k, n_, d_, t_ in clean:
                if k == 'SUB':
                    rows_html.append(f'<tr><th colspan="3">{esc(n_)}</th></tr>'); continue
                f_ = form_of(n_, t_); forms[f_] += 1
                rows_html.append(f'<tr><td><span class="en">{esc(n_)}</span></td><td>{esc(d_)}</td>'
                                 f'<td class="w"><span class="form">{f_}</span></td></tr>')
            body.append('  <div class="tbl"><table><tr><th>Cụm từ / câu</th><th>Nghĩa</th><th>Dạng</th></tr>'
                        + ''.join(rows_html) + '</table></div>')
        else:
            ul = []
            for k, n_, d_, t_ in clean:
                if k == 'SUB':
                    if ul: body.append('  <ul class="pos">' + ''.join(ul) + '</ul>'); ul = []
                    body.append(f'  <h4>{esc(n_)}</h4>')
                else:
                    forms[form_of(n_, t_)] += 1
                    ul.append(f'<li><span class="en">{esc(n_)}</span></li>')
            if ul:
                body.append('  <ul class="pos">' + ''.join(ul) + '</ul>')
        body.append('  <p class="src">Nguồn: Vocabulary-new.xlsx — sheet “IELTS Speaking All”.</p>')
        body.append('</section>')
        out.append('\n'.join(body))
    summary = ' '.join(f'<span class="chip">{f} · {c}</span>' for f, c in forms.most_common())
    intro = (f'{sum(forms.values())} mục từ file Excel, chia theo tình huống. Phân loại theo dạng: '
             f'</p>\n<div class="chips">{summary}</div>\n<p class="vi">Rê chuột lên câu tiếng Anh rồi bấm 🔊 để nghe.')
    title = g['title']
    print(f'{key}: {title} — {len(cards)} cards, {sum(forms.values())} items')
    if dry:
        continue
    f = OUT / f'{key}.html'
    if f.exists() and not force:
        print(f'   skip (exists; --force to overwrite)'); continue
    f.write_text(f'<h2 class="chapter" id="{key}"><span class="num">{{{{N}}}}</span>{esc(title)}{BADGE}</h2>\n'
                 f'<p class="chapter-intro">{intro}</p>\n\n' + '\n\n'.join(out) + '\n')
    (OUT / f'{key}.toc.json').write_text(json.dumps({'id': key, 'title': title, 'sections': secs}, ensure_ascii=False))
print(f'TOTAL items {total} in {len(order)} chapters')
if not dry:
    (HERE / 'ielts' / 'excel_order.json').write_text(json.dumps(order))
