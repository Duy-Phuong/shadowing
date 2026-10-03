"""Write agent-tagged parts of speech (conv_groups/P*.out.tsv: KEY<TAB>TAG, KEY = card-id#row) into empty 'Loại' cells."""
import re, json, html, glob, collections
from pathlib import Path
ALLOWED = {'n', 'v', 'adj', 'adv', 'prep', 'conj', 'pron', 'idiom'}
tags, bad = {}, collections.Counter()
for f in sorted(glob.glob('conv_groups/P*.out.tsv')):
    for line in open(f):
        if '\t' not in line: continue
        key, tag = line.rstrip('\n').split('\t')[:2]
        tag = ', '.join(t for t in (x.strip().lower() for x in tag.split(',')) if t in ALLOWED)
        tags[key.strip()] = tag
print(len(tags), 'tags loaded;', sum(1 for t in tags.values() if t), 'with a part of speech')
stats = collections.Counter()
for k in json.load(open('vocab/order.json')):
    p = Path(f'vocab/fragments/{k}.html'); t = p.read_text(); orig = t
    def card(sec):
        cid = sec.group(1); n = [0]; body = sec.group(0)
        def table(tm):
            tb = tm.group(2); rows = re.findall(r'<tr>.*?</tr>', tb, re.S)
            hdr = [html.unescape(re.sub(r'<[^>]+>', '', x)).strip() for x in re.findall(r'<th[^>]*>(.*?)</th>', rows[0], re.S)] if rows else []
            if 'Loại' not in hdr: return tm.group(0)
            li = hdr.index('Loại'); out = tb
            for r in rows[1:]:
                cells = list(re.finditer(r'(<td[^>]*>)(.*?)(</td>)', r, re.S))
                if len(cells) <= li: continue
                n[0] += 1
                if html.unescape(re.sub(r'<[^>]+>', '', cells[li].group(2))).strip(): continue
                tag = tags.get(f'{cid}#{n[0]}')
                if tag is None: stats['no tag'] += 1; continue
                if not tag: stats['left empty (sentence/label)'] += 1; continue
                c = cells[li]; new = r[:c.start(2)] + tag + r[c.end(2):]
                out = out.replace(r, new, 1); stats['filled'] += 1
            return tm.group(1) + out + tm.group(3)
        return re.sub(r'(<table>)(.*?)(</table>)', table, body, flags=re.S)
    t = re.sub(r'<section class="card[^"]*" id="([^"]+)"[^>]*>.*?</section>', card, t, flags=re.S)
    if t != orig: p.write_text(t)
print(dict(stats))
