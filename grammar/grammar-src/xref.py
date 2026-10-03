"""Cross-tab 'Xem thêm' links: a grammar card ↔ cards in the IELTS / Từ vựng / Cụm từ tabs that teach the same
English expressions. Computed at build time (assemble.py imports it); nothing is written to the sources."""
import re, html, json, collections
from pathlib import Path
HERE = Path(__file__).parent
TABS = {'grammar': 'Ngữ pháp', 'ielts': 'IELTS', 'vocab': 'Từ vựng', 'colloc': 'Cụm từ'}
STOP = set('a an the to of in on at for with and or be is are was were do does did it this that you i we they he she '
           'my your part yes no not n v s o adj adv sb sth someone something about from by as if so '
           'have give make take very more less much many good time like get go come put '
           'part 1 part 2 part 3 từ vựng'.split())
CARD = re.compile(r'<section class="card[^"]*" id="([^"]+)"[^>]*>(.*?)</section>', re.S)

def clean(x): return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', x))).strip()

def terms_of(h3):
    """English expressions named in a card title: split on separators, keep Latin phrases."""
    t = re.sub(r'\{\{N\}\}\.\S+|\d+\.\d+|🆕|✎ \w+( \w+)?', ' ', clean(h3)).lower()
    out = set()
    for part in re.split(r'[·,/;:()\[\]“”"–—]| vs\.? | và | hay | or | & ', t):
        part = part.strip(" .!?'’-…")
        if not part or re.search(r'[à-ỹđ]', part): continue                 # Vietnamese words → not a term
        words = part.split()
        if not 1 <= len(words) <= 4: continue
        if len(words) == 1 and (len(part) < 4 or part in STOP): continue
        out.add(part)
    return out

def load(sources):
    cards = []
    for tab, files in sources.items():
        for f in files:
            if not f.exists(): continue
            for m in CARD.finditer(f.read_text()):
                body = m.group(2)
                h3 = re.search(r'<h3>(.*?)</h3>', body, re.S)
                if not h3 or 'exercise' in m.group(0)[:60] or 'Nguồn' in h3.group(1)[:40]: continue
                title = re.sub(r'\{\{N\}\}\.\S+\s*|🆕|✎ \w+( \w+)?', '', clean(h3.group(1))).strip()
                title = re.sub(r'\s+(\d+|Part \d|Từ vựng|Ý tưởng|Writing|Kỹ năng)$', '', title).strip()
                title = re.sub(r'\s+(\d+|Part \d|Từ vựng)$', '', title).strip()
                cards.append({'id': m.group(1), 'tab': tab, 'title': title[:70], 'terms': terms_of(h3.group(1)),
                              'text': ' ' + clean(body).lower() + ' '})
    return cards

def compute(sources, max_links=3):
    cards = load(sources)
    df = collections.Counter(t for c in cards for t in c['terms'])
    links = collections.defaultdict(list)
    gram = [c for c in cards if c['tab'] == 'grammar']
    other = [c for c in cards if c['tab'] != 'grammar']
    def score(a, b):                       # terms from a's title that b's title also names
        common = {t for t in a['terms'] & b['terms'] if df[t] <= 5}
        return common
    for g in gram:
        for o in other:
            common = score(g, o) or score(o, g)
            if common:
                w = sum(2 if ' ' in t else 1 for t in common)
                links[g['id']].append((w, o)); links[o['id']].append((w, g))
    out = {}
    for cid, lst in links.items():
        seen, best = set(), []
        for w, c in sorted(lst, key=lambda x: -x[0]):
            if c['id'] in seen: continue
            seen.add(c['id']); best.append((c['id'], c['title'], TABS[c['tab']]))
            if len(best) == max_links: break
        out[cid] = best
    return out

def inject(frag, xrefs):
    """Append a 'Xem thêm' line to every card that has cross-tab links (render-time only)."""
    def add(m):
        cid = m.group(1); refs = xrefs.get(cid)
        if not refs: return m.group(0)
        a = ' · '.join(f'<a href="#{i}">{html.escape(t)}</a> <small>({tab})</small>' for i, t, tab in refs)
        return m.group(0)[:-len('</section>')].rstrip() + f'\n  <p class="xref">🔗 Xem thêm: {a}</p>\n</section>'
    return CARD.sub(add, frag)

if __name__ == '__main__':
    S = {'grammar': [HERE / 'batch1.html'] + [HERE / f'fragments/{k}.html' for k in json.load(open(HERE / 'order.json'))]}
    for tab in ('ielts', 'vocab', 'colloc'):
        S[tab] = [HERE / tab / 'fragments' / f'{k}.html' for k in json.load(open(HERE / tab / 'order.json'))]
    x = compute(S)
    g = {k: v for k, v in x.items() if not re.match(r'(sp-|ph-|cs-|v-|vx-|t1|wr|we|sk|misc)', k)}
    print(len(x), 'cards get links;', len(g), 'grammar cards')
    for k in list(g)[:25]: print(k, '→', [f'{t} ({tab})' for _, t, tab in g[k]])
