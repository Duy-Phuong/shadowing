"""Copy edits made in the browser (✏️ Chế độ sửa → 💾 Lưu bản sửa) back into the source files.

Usage:
    python3 sync_back.py ~/Downloads/english-grammar-edited.html          # apply + rebuild
    python3 sync_back.py --dry-run ~/Downloads/english-grammar-edited.html
Every section card has a stable id (added by assemble.py), so each edited card replaces the card
with the same id in fragments/<key>.html or batch1.html. Chapter numbers shown in the page
("12.3") are turned back into the {{N}} placeholder. Cards you deleted/added in the browser and
edits outside cards (chapter titles/intros, TOC) are reported, not applied — tell Claude or edit
the source for those.
"""
import html, json, re, subprocess, sys
from pathlib import Path

HERE = Path(__file__).parent
dry = '--dry-run' in sys.argv
args = [a for a in sys.argv[1:] if a != '--dry-run']
if not args:
    sys.exit(__doc__)
edited = Path(args[0]).expanduser().read_text()

CARD = re.compile(r'<section\b[^>]*\bid="([^"]+)"[^>]*>(.*?)</section>', re.S)


def norm(s):
    s = html.unescape(s).replace('\xa0', ' ')
    s = re.sub(r'\s+', ' ', s)
    s = re.sub(r'\s*(<[^>]+>)\s*', r'\1', s)          # ignore whitespace around tags
    return s.strip()


order = json.loads((HERE / 'order.json').read_text())
chap_no = {}
n = 4
for k in order:
    if (HERE / f'fragments/{k}.html').exists():
        n += 1
        chap_no[k] = n

sources = {HERE / 'batch1.html': None}
sources.update({HERE / f'fragments/{k}.html': k for k in chap_no})
for tab in ('ielts', 'vocab', 'colloc'):                   # secondary tabs number their chapters from 1
    of = HERE / tab / 'order.json'
    m = 0
    for k in (json.loads(of.read_text()) if of.exists() else []):
        f = HERE / tab / 'fragments' / f'{k}.html'
        if f.exists():
            m += 1
            chap_no[k] = m
            sources[f] = k
texts = {p: p.read_text() for p in sources}
where = {}
for p, t in texts.items():
    for m in CARD.finditer(t):
        where[m.group(1)] = p

changed, unknown, seen = [], [], set()
for m in CARD.finditer(edited):
    sid, inner = m.groups()
    if sid in ('c4-ex', 'c4-src'):  # generated / retitled by assemble.py — not editable here
        continue
    if sid.startswith('card-'):
        unknown.append(sid); continue
    p = where.get(sid)
    if not p:
        unknown.append(sid); continue
    seen.add(sid)
    key = sources[p]
    src_m = next(x for x in CARD.finditer(texts[p]) if x.group(1) == sid)
    src_inner = src_m.group(2)
    if key:
        n_ = str(chap_no[key])
        if norm(src_inner.replace('{{N}}', n_)) == norm(inner):
            continue
        # restore the chapter-number placeholder only in the heading and in section references
        inner = re.sub(rf'(<h3>\s*){n_}\.(?=\d)', r'\1{{N}}.', inner, count=1)
        inner = re.sub(rf'((?:mục|Mục|xem|Xem|section)\s+){n_}\.(?=\d)', r'\1{{N}}.', inner)
    elif norm(src_inner) == norm(inner):
        continue
    new_card = src_m.group(0)[:src_m.start(2) - src_m.start(0)] + inner + '</section>'
    texts[p] = texts[p][:src_m.start()] + new_card + texts[p][src_m.end():]
    changed.append((sid, p.name))

missing = [sid for sid in where if sid not in seen and sid != 'sources']
print(f'changed cards: {len(changed)}')
for sid, f in changed:
    print(f'  {sid:14s} → {f}')
if unknown:
    print(f'cards not found in sources (new in browser?) — not applied: {unknown}')
if missing:
    print(f'cards missing from the edited file (deleted in browser?) — not removed: {missing[:10]}')

if changed and not dry:
    for p, t in texts.items():
        if t != p.read_text():
            p.write_text(t)
    r = subprocess.run([sys.executable, str(HERE / 'assemble.py')], capture_output=True, text=True)
    print(r.stdout.strip() or r.stderr.strip())
elif dry:
    print('(dry run — nothing written)')
