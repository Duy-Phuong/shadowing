"""Sort vocabulary tables A→Z by their first (English) column.  python3 sort_vocab.py [--dry-run] <fragment files>
A table is sorted only if: first row is a header (th), every other row is a data row (td only, no colspan/rowspan),
and the first cell of each data row starts with Latin text (an English word/phrase). Other tables are left alone."""
import re, sys, html, unicodedata
from pathlib import Path
dry = '--dry-run' in sys.argv
files = [Path(a) for a in sys.argv[1:] if a != '--dry-run']
TABLE = re.compile(r'(<table>)(.*?)(</table>)', re.S)
ROW = re.compile(r'\s*<tr>.*?</tr>', re.S)

def key(row):
    cell = re.search(r'<td[^>]*>(.*?)</td>', row, re.S).group(1)
    t = html.unescape(re.sub(r'<[^>]+>', '', cell)).strip().lower()
    t = unicodedata.normalize('NFD', t)
    t = re.sub(r'[\u0300-\u036f]', '', t)             # drop accents (café → cafe)
    t = re.sub(r"[^a-z0-9 ]+", '', t.replace('-', ' ').replace('/', ' '))   # ignore punctuation like a dictionary
    return re.sub(r'\s+', ' ', t).strip()

def sort_table(body):
    rows = ROW.findall(body)
    if len(rows) < 3 or ''.join(rows).strip() != body.strip(): return None      # unexpected content between rows
    head, data = rows[0], rows[1:]
    if '<th' not in head or any('<th' in r or 'colspan' in r or 'rowspan' in r for r in data): return None
    firsts = [html.unescape(re.sub(r'<[^>]+>', '', re.search(r'<td[^>]*>(.*?)</td>', r, re.S).group(1))).strip() for r in data]
    nnum = sum(bool(re.match(r'\d+\.\s', x)) for x in firsts)
    if nnum * 2 >= len(firsts) and nnum < len(firsts):
        return None                                   # numbered sub-lists separated by heading rows — sorted by hand
    if 0 < nnum < len(firsts):                        # partly numbered grab-bag → drop the numbers, sort everything
        data = [re.sub(r'(<td[^>]*>(?:<[^>]+>)*)\s*\d+\.\s*', r'\1', r, count=1) if re.match(r'\d+\.\s', x) else r
                for r, x in zip(data, firsts)]
        firsts = [re.sub(r'^\d+\.\s*', '', x) for x in firsts]
    numbered = nnum == len(firsts)                    # "1. …" list → sort + renumber
    if not numbered and sum(bool(re.match(r'\d', x)) for x in firsts) * 2 >= len(firsts):
        return None                                   # times of day, sums, … — natural order matters
    keys = [key(re.sub(r'(<td[^>]*>(?:<[^>]+>)*)\s*\d+\.\s*', r'\1', r, count=1)) if numbered else key(r) for r in data]
    if any(not k or not re.match(r'[a-z0-9]', k) for k in keys): return None   # first column isn't English
    order = sorted(range(len(data)), key=lambda i: (keys[i], i))
    if order == list(range(len(data))): return False
    if numbered:
        data = [re.sub(r'(<td[^>]*>(?:<[^>]+>)*)\s*\d+\.', lambda m, n=n: f'{m.group(1)}{n}.', data[i], count=1)
                for n, i in enumerate(order, 1)]
        order = list(range(len(data)))
    lead = re.match(r'\s*', body).group(0)
    return lead + head.strip() + ''.join(data[i] for i in order) + body[len(body.rstrip()):]

tot = sorted_n = skipped = 0
for f in files:
    t = f.read_text(); n = [0, 0, 0]
    def fix(m):
        r = sort_table(m.group(2)); n[0] += 1
        if r is None: n[2] += 1; return m.group(0)
        if r is False: return m.group(0)
        n[1] += 1; return m.group(1) + r + m.group(3)
    new = TABLE.sub(fix, t)
    tot += n[0]; sorted_n += n[1]; skipped += n[2]
    print(f'{f.name:22s} tables {n[0]:4d}  reordered {n[1]:4d}  left alone {n[2]:3d}')
    if not dry and new != t: f.write_text(new)
print(f'TOTAL tables {tot}, reordered {sorted_n}, left alone (not a plain word list) {skipped}' + ('  (dry run)' if dry else ''))
