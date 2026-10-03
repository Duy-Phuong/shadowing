"""Validate a chapter fragment or draft file before it is added:  python3 check_frag.py <file> [key]
Checks tag balance, id / radio-name prefix (when key given) and that the toc.json matches the cards."""
import json, re, sys
from html.parser import HTMLParser
from pathlib import Path

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
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                skipped = [t for t, _ in self.stack[i + 1:]]
                if any(t not in ('p', 'li') for t in skipped):
                    self.errors.append(f'</{tag}> at line {self.getpos()[0]} closes over {skipped}')
                del self.stack[i:]; return
        self.errors.append(f'stray </{tag}> at line {self.getpos()[0]}')

f = Path(sys.argv[1]); key = sys.argv[2] if len(sys.argv) > 2 else None
text = f.read_text()
c = Checker(); c.feed(text); c.close()
if c.stack: c.errors.append(f'unclosed: {[f"{t}@{p[0]}" for t, p in c.stack][:8]}')
depth = 0
for tag in re.findall(r'<section\b|</section>', text):
    depth += 1 if tag == '<section' else -1
    if depth > 1:
        c.errors.append('nested <section> inside a card — put exercises in their own sibling card'); break
dup = sorted({i for i in c.ids if c.ids.count(i) > 1})
if dup: c.errors.append(f'duplicate ids: {dup[:8]}')
if key:
    bad = [i for i in c.ids if not i.startswith(key)]
    if bad: c.errors.append(f'ids without prefix {key}: {bad[:5]}')
    badr = [r for r in c.radios if not (r or '').startswith(key)]
    if badr: c.errors.append(f'radio names without prefix: {badr[:5]}')
    toc = f.with_suffix('.toc.json')
    if toc.exists():
        t = json.loads(toc.read_text()); tids = [s['id'] for s in t['sections']]
        cards = re.findall(r'<section class="card[^"]*" id="([^"]+)"', text)
        missing = [x for x in tids if x not in cards]
        if missing: c.errors.append(f'toc ids not in fragment: {missing[:5]}')
        if t.get('id') != key: c.errors.append(f'toc id {t.get("id")} != {key}')
    elif f.suffix == '.html' and 'drafts' not in str(f): c.errors.append('toc.json missing')
print('OK' if not c.errors else 'PROBLEMS:\n - ' + '\n - '.join(c.errors))
