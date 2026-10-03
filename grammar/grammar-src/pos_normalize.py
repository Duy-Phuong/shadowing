"""Normalise the 'Loại' (part of speech) column of vocab tables to n / v / adj / adv (+ idiom, prep, pron, conj).
Moves IPA that was mis-imported into the column under the word, links/notes into the meaning cell.
python3 pos_normalize.py [--dry-run] vocab/fragments/*.html"""
import re, sys, html, collections
from pathlib import Path
dry = '--dry-run' in sys.argv
files = [Path(a) for a in sys.argv[1:] if a != '--dry-run']
VI = {'danh từ': 'n', 'danh từ ghép': 'n', 'cụm danh từ': 'n', 'động từ': 'v', 'cụm động từ': 'v', 'tính từ': 'adj',
      'trạng từ': 'adv', 'thành ngữ': 'idiom', 'giới từ': 'prep', 'pronoun': 'pron', 'đại từ sở hữu': 'pron',
      'tính từ sở hữu': 'adj', 'danh từ/động từ': 'n, v', 'model verb': 'v', 'exclamation, noun': 'n'}
TOK = {'n': 'n', 'noun': 'n', 'v': 'v', 'verb': 'v', 'a': 'adj', 'adj': 'adj', 'adv': 'adv', 'idiom': 'idiom',
       'prep': 'prep', 'pron': 'pron', 'conj': 'conj'}
stats = collections.Counter()

def parse(raw):
    """→ (pos, ipa_list, extra_note)"""
    txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw)).strip()
    if not txt: return '', [], ''
    low = txt.lower().strip()
    if low in VI: return VI[low], [], ''
    if low == 'correct': return '', [], '✓ câu đúng'
    urls = re.findall(r'https?://\S+', txt); rest = re.sub(r'https?://\S+', ' ', txt)
    ipas = re.findall(r'/[^/]{1,40}/', rest); rest = re.sub(r'/[^/]{1,40}/', ' ', rest)
    rest = re.sub(r'[()]', ' ', rest).strip(' ,;-')
    toks = re.findall(r'[a-z]+', rest.lower())
    note = ''
    if rest and (not toks or any(t not in TOK for t in toks)):
        if re.fullmatch(r"[a-zɪəʊɔːæʃʒθðŋɜʌɑˈˌ' ]+", rest) and not toks: ipas.append('/' + rest + '/')
        else: note = html.escape(rest); toks = []
    pos = []
    if toks:
        mapped = [TOK[t] for t in toks]
        if '+' in rest:                                   # "a + n", "v + adv" → phrase headed by n / v
            pos = ['n'] if 'n' in mapped else (['v'] if 'v' in mapped else [mapped[-1]])
        else:
            for m in mapped:
                if m not in pos: pos.append(m)
    extra = ' '.join(filter(None, [note] + [f'<a href="{u}">nguồn</a>' for u in urls]))
    return ', '.join(pos), ipas, extra

def fix_table(tb):
    rows = re.findall(r'<tr>.*?</tr>', tb, re.S)
    if not rows: return tb
    hdr = [html.unescape(re.sub(r'<[^>]+>', '', x)).strip() for x in re.findall(r'<th[^>]*>(.*?)</th>', rows[0], re.S)]
    if 'Loại' not in hdr: return tb
    li = hdr.index('Loại')
    out = tb
    for r in rows[1:]:
        cells = list(re.finditer(r'(<td[^>]*>)(.*?)(</td>)', r, re.S))
        if len(cells) <= li: continue
        old = cells[li].group(2)
        if not html.unescape(re.sub(r'<[^>]+>', '', old)).strip(): stats['empty'] += 1; continue
        pos, ipas, extra = parse(old)
        new = r
        def put(i, content):
            nonlocal new
            c = list(re.finditer(r'(<td[^>]*>)(.*?)(</td>)', new, re.S))[i]
            new = new[:c.start(2)] + content + new[c.end(2):]
        put(li, pos)
        stats['normalised' if pos else 'cleared'] += 1
        if ipas and 'class="ipa"' not in cells[0].group(2):
            put(0, cells[0].group(2) + ' <span class="ipa">' + html.escape(' '.join(ipas)) + '</span>'); stats['ipa moved'] += 1
        if extra and len(cells) > li + 1:
            c2 = list(re.finditer(r'(<td[^>]*>)(.*?)(</td>)', new, re.S))[li + 1]
            put(li + 1, (c2.group(2) + ' <span class="vi">(' + extra + ')</span>').strip()); stats['note moved'] += 1
        out = out.replace(r, new, 1)
    return out

for f in files:
    t = f.read_text()
    new = re.sub(r'(<table>)(.*?)(</table>)', lambda m: m.group(1) + fix_table(m.group(2)) + m.group(3), t, flags=re.S)
    if not dry and new != t: f.write_text(new)
print(dict(stats), '(dry run)' if dry else '')
