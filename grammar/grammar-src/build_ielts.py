"""Turn exported IELTS sample-answer pages (ielts_src/*.md, "## Image N: Title" blocks) into IELTS-tab
chapter fragments (ielts/fragments/<key>.html + .toc.json), grouped by topic.

Usage:
    python3 build_ielts.py --dry-run     # show topic / part for every block
    python3 build_ielts.py               # write fragments (refuses to overwrite unless --force)
Fragments are the source of truth afterwards (edit them, not ielts_src).
"""
import html, json, re, sys
from pathlib import Path

HERE = Path(__file__).parent
SRC, OUT = HERE / 'ielts_src', HERE / 'ielts' / 'fragments'
dry, force = '--dry-run' in sys.argv, '--force' in sys.argv

# (key, chapter title, keywords matched against the block title, lower-case) — first match wins
TOPICS = [
    ('we',   'Writing: bài mẫu & dàn ý theo chủ đề', ['model essay', 'essay outline', 'writing task 2 structures']),
    ('misc', 'Mẹo & tài liệu thêm', ['contractions', 'word order', 'alternatives to', 'aptis']),
    ('sp-env',  'Môi trường & thời tiết', ['environment', 'climate', 'heatwave', 'weather']),
    ('sp-tech', 'Công nghệ & truyền thông', ['technology', 'robot', 'artificial intelligence', 'social media', 'media',
                                           'news', 'advertise', 'internet', 'space exploration', 'elevator',
                                           'digital learning', 'forecast speaking']),
    ('sp-work', 'Công việc, học tập & kỹ năng', ['career', 'textbook', 'skill', 'learning', 'language', 'exam',
                                                'school', 'work', 'study', 'notes', 'concentration', 'reading vocabulary',
                                                'being on time', 'breaks', 'history']),
    ('sp-travel', 'Du lịch, địa điểm & thành phố', ['travel', 'touris', 'place', 'beach', 'city', 'town', 'hội an',
                                                   'hạ long', 'phú quốc', 'country', 'trip', 'lost', 'journey',
                                                   'traffic', 'urban', 'local area', 'holiday']),
    ('sp-health', 'Sức khỏe, ăn uống & lối sống', ['sleep', 'health', 'stress', 'meditation', 'aging', 'mentally',
                                                  'busy lifestyle', 'routine', 'sport', 'food', 'eating', 'chocolate',
                                                  'cake', 'free time', 'spare time', 'relaxing']),
    ('sp-hobby', 'Sở thích & giải trí', ['hobb', 'music', 'reading', 'video', 'entertainment', 'photograph', 'joke',
                                        'laugh', 'colou', 'color', 'smell', 'boring', 'waiting', 'art and']),
    ('sp-people', 'Con người & các mối quan hệ', ['friend', 'role model', 'leader', 'independent', 'gift', 'patience',
                                                 'voice', 'success', 'gifted']),
    ('sp-society', 'Văn hóa, xã hội & mua sắm', ['culture', 'heritage', 'tradition', 'fashion', 'wear', 'competition',
                                                'society', 'shopping', 'mall', 'saving money', 'money']),
    ('sp-exp', 'Trải nghiệm, quyết định & thói quen cá nhân', ['decision', 'wrong', 'surpris', 'challenge', 'trying new',
                                                              'accepting', 'experience', 'losing', 'risk', 'plans',
                                                              'reminder', 'everyday item', 'days of the week']),
]
ORDER = ['sp-work', 'sp-tech', 'sp-env', 'sp-travel', 'sp-health', 'sp-hobby', 'sp-people', 'sp-society', 'sp-exp',
         'we', 'misc']
VI = re.compile(r'[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]', re.I)


OVERRIDE = {'anti-aging': 'sp-health', 'travel and technology': 'sp-travel', 'patience': 'sp-people'}


VI_WORDS = {'và', 'của', 'là', 'tôi', 'những', 'được', 'không', 'một', 'các', 'có', 'người', 'với', 'cho', 'trong',
            'này', 'để', 'khi', 'thì', 'rất', 'bạn', 'nhiều', 'mình', 'cũng', 'như', 'đã', 'vì', 'sẽ', 'nên'}


def is_vi(text):
    words = re.findall(r'\w+', text.lower())
    if not words:
        return False
    marked = sum(1 for w in words if VI.search(w) or w in VI_WORDS)
    return marked / len(words) > 0.3


VOCAB_RE = [re.compile(r'^[-*]?\s*\**(.+?)\**\s*(?::\s*)?(/[^/]+/)\s*(?::|→|-)\s*(.+)$'),
            re.compile(r'^[-*]?\s*\**(.+?)\**\s*()(?::|→| - )\s*(.+)$')]


def vocab_line(l):
    l = l.replace('$\\rightarrow$', '→')
    for rx in VOCAB_RE:
        v = rx.match(l)
        if v and is_vi(v.group(3)) and not is_vi(v.group(1)) and len(v.group(1)) < 80:
            return v.group(1).strip('* '), v.group(2) or '', v.group(3)
    return None


def topic_of(title):
    t = title.lower()
    for k, v in OVERRIDE.items():
        if k in t:
            return v
    for key, _, kws in TOPICS:
        if any(k in t for k in kws):
            return key
    return 'sp-exp'


def part_of(title, body):
    t = title.lower()
    if topic_of(title) == 'misc':
        return 'Mẹo'
    if 'news' in t or 'meditation guide' in t:
        return 'Bài đọc'
    if 'vocabulary list' in t:
        return 'Từ vựng'
    if 'forum' in t and 'essay' not in t:
        return 'Thảo luận'
    if 'cue card' in t or t.startswith('describe') or 'cue card' in body.lower()[:300]:
        return 'Part 2'
    if 'part 1' in t:
        return 'Part 1'
    if 'part 3' in t or 'questions' in t or 'discussion' in t:
        return 'Part 3'
    if 'model essay' in t or 'essay' in t or 'writing' in t:
        return 'Writing'
    return 'Part 1' if re.search(r'\byou(r)?\b', body[:400], re.I) else 'Part 3'


def inline(s):
    s = s.replace('$\\rightarrow$', '→').replace('$\\to$', '→')
    s = re.sub(r'\$([^$]{1,40})\$', r'\1', s)
    s = html.escape(s, quote=False)
    return re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', s)


def render(block, cid, part, src):
    title = block['title']
    out = [f'<section class="card" id="{cid}">',
           f'  <h3>{{{{N}}}}.X {inline(title)} <span class="part">{part}</span></h3>']
    trans, vocab = [], []
    for head, lines in [('', block['intro'])] + block['sections']:
        h = re.sub(r'\*\*|:$', '', head).strip().rstrip(':')
        hl = h.lower()
        text = [l for l in lines if l.strip() and not re.match(r'^\(?(Note:|Here is the transcri|Below is the transcri)', l.strip())]
        if hl.startswith('vocabulary') or hl.startswith('từ vựng'):
            for l in text:
                m = re.match(r'-\s*\*\*(.+?)\*\*\s*(/[^/]+/)?\s*(?:[:→-]|\$\\rightarrow\$)?\s*(.*)', l)
                if m:
                    vocab.append((m.group(1), m.group(2) or '', m.group(3)))
            continue
        if is_vi(h) or (not h.endswith('?') and text and sum(is_vi(l) for l in text) > len(text) / 2):
            keep = []
            for l in text:
                v = vocab_line(l)
                if v: vocab.append(v)
                else: keep.append(l)
            trans.append((h, keep)); continue
        if hl in ('cue card', 'sample answer', 'answer', 'sample'):
            if hl == 'cue card':
                items = ''.join(f'<li>{inline(l.lstrip("- "))}</li>' if l.startswith('-') else f'<b>{inline(l)}</b><br>'
                                for l in text)
                out.append(f'  <div class="callout cue"><b>Cue card</b><br>{items}</div>')
            else:
                out += [f'  <p class="sample"><span class="en">{inline(l)}</span></p>' for l in text]
            continue
        if h:
            out.append(f'  <h4 class="q"><span class="en">{inline(h)}</span></h4>')
        for l in text:
            v = vocab_line(l)
            if v:
                vocab.append(v); continue
            if is_vi(l):
                trans.append(('', [l])); continue
            if l.startswith(('- ', '* ')):
                out.append(f'  <p class="sample li"><span class="en">{inline(l[2:])}</span></p>')
            elif l.startswith('|'):
                cells = [c.strip() for c in l.strip('|').split('|')]
                out.append('  <p class="sample">' + ' · '.join(inline(c) for c in cells) + '</p>')
            else:
                out.append(f'  <p class="sample"><span class="en">{inline(l)}</span></p>')

    if trans:
        body = ''.join((f'<p><b>{inline(h)}</b></p>' if h else '') + ''.join(f'<p>{inline(l)}</p>' for l in t) for h, t in trans)
        out.append(f'  <details class="trans"><summary>🇻🇳 Bản dịch</summary>{body}</details>')
    if vocab:
        rows = ''.join(f'<tr><td><span class="en">{inline(a)}</span></td><td class="ipa">{html.escape(b)}</td>'
                       f'<td>{inline(c)}</td></tr>' for a, b, c in vocab)
        out.append(f'  <details class="vocab"><summary>📚 Từ vựng ({len(vocab)})</summary>'
                   f'<div class="tbl"><table><tr><th>Từ / cụm</th><th>IPA</th><th>Nghĩa</th></tr>{rows}</table></div></details>')
    out.append(f'  <p class="src">Nguồn: {src}</p>')
    out.append('</section>')
    return '\n'.join(out)


blocks = []
for f in sorted(SRC.glob('*.md')):
    page = re.search(r'^TITLE: (.*)$', f.read_text(), re.M).group(1)
    for m in re.finditer(r'^## Image (\d+): (.*?)\n(.*?)(?=^## Image |\Z)', f.read_text(), re.S | re.M):
        num, title, body = m.group(1), m.group(2).strip(), m.group(3)
        title = re.sub(r'\s*\(Note:.*', '', title)
        secs, intro, cur = [], [], None
        for line in body.split('\n'):
            line = re.sub(r'^\s*\[header_4\]\s*', '### ', line)
            if line.startswith('### '):
                cur = [line[4:].strip(), []]; secs.append(cur)
            elif cur:
                cur[1].append(line.strip())
            else:
                intro.append(line.strip())
        blocks.append({'title': title, 'body': body, 'sections': [(a, b) for a, b in secs], 'intro': intro,
                       'src': f'Notion “{page}”, ảnh {num}'})

def words(t):
    return set(re.findall(r'[a-z]{3,}', t.lower()))

kept = []
for b in blocks:
    w = words(b['body'])
    dup = next((k for k in kept if k['title'] == b['title'] and
                len(w & words(k['body'])) / max(1, len(w | words(k['body']))) > 0.6), None)
    if dup:
        print(f'   duplicate skipped: {b["title"]} ({b["src"]} = {dup["src"]})')
        continue
    kept.append(b)
blocks = kept

groups = {}
for b in blocks:
    groups.setdefault(topic_of(b['title']), []).append(b)

if dry:
    for key in ORDER:
        name = next(n for k, n, _ in TOPICS if k == key)
        print(f'\n== {key}: {name} ({len(groups.get(key, []))})')
        for b in groups.get(key, []):
            print(f'   [{part_of(b["title"], b["body"])}] {b["title"][:70]}')
    sys.exit()

OUT.mkdir(parents=True, exist_ok=True)
for key in ORDER:
    items = groups.get(key, [])
    if not items:
        continue
    f = OUT / f'{key}.html'
    if f.exists() and not force:
        print(f'skip {f.name} (exists; use --force to overwrite)'); continue
    name = next(n for k, n, _ in TOPICS if k == key)
    rank = {'Part 1': 1, 'Part 2': 2, 'Part 3': 3, 'Writing': 4}
    items.sort(key=lambda b: rank.get(part_of(b['title'], b['body']), 5))
    cards, secs = [], []
    for i, b in enumerate(items, 1):
        cid, part = f'{key}-{i}', part_of(b['title'], b['body'])
        cards.append(render(b, cid, part, b['src']).replace('{{N}}.X', f'{{{{N}}}}.{i}', 1))
        secs.append({'id': cid, 'title': f'{b["title"][:48]} · {part}'})
    intro = {'we': 'Bài mẫu, dàn ý và cấu trúc Writing Task 2 bạn đã lưu, theo chủ đề.',
             'misc': 'Các bảng mẹo và danh sách cụm từ lưu kèm trong trang Speaking.'}.get(
        key, f'Câu hỏi và câu trả lời mẫu IELTS Speaking chủ đề “{name}” — Part 1, Part 2 (cue card), Part 3. '
             'Bấm 🇻🇳 để xem bản dịch, 📚 để xem từ vựng.')
    if key in ('we', 'misc'):   # phrase lists: show the table right away
        cards = [c.replace('<details class="vocab"><summary>📚 Từ vựng', '<details class="vocab" open><summary>📚 Cụm từ') for c in cards]
    f.write_text(f'<h2 class="chapter" id="{key}"><span class="num">{{{{N}}}}</span>{name}</h2>\n'
                 f'<p class="chapter-intro">{intro}</p>\n\n' + '\n\n'.join(cards) + '\n')
    (OUT / f'{key}.toc.json').write_text(json.dumps({'id': key, 'title': name, 'sections': secs}, ensure_ascii=False))
    print(f'wrote {f.name}: {len(items)} cards')
