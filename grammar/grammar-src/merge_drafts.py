"""Insert draft cards (drafts/*.html) into their chapters, number them, update TOCs, rebuild.

Draft format — each card preceded by a marker naming the target chapter key:
    <!-- CARD ques -->
    <section class="card" id="ques-v3-1"><h3>{{N}}.X Title<span class="new" …>🆕</span></h3> … </section>
Cards are appended after the chapter's highest-numbered section (existing numbers and cross-references
don't change); "{{N}}.X" becomes the next free number.

Usage:  python3 merge_drafts.py drafts/A.html drafts/B.html [--dry-run]
"""
import json, re, subprocess, sys
from pathlib import Path

HERE = Path(__file__).parent
dry = '--dry-run' in sys.argv
files = [Path(a) for a in sys.argv[1:] if a != '--dry-run']
SEC = re.compile(r'<section class="card[^"]*" id="([^"]+)"[^>]*>.*?</section>', re.S)

by_key = {}
for f in files:
    parts = re.split(r'<!--\s*CARD\s+([\w-]+)\s*-->', f.read_text())
    for key, chunk in zip(parts[1::2], parts[2::2]):
        by_key.setdefault(key, []).extend(m.group(0) for m in SEC.finditer(chunk))

for key, cards in by_key.items():
    base = next((d for d in (HERE / 'fragments', HERE / 'ielts' / 'fragments', HERE / 'vocab' / 'fragments', HERE / 'colloc' / 'fragments')
                 if (d / f'{key}.html').exists()), HERE / 'fragments')
    frag, tocf = base / f'{key}.html', base / f'{key}.toc.json'
    if not frag.exists():
        print(f'!! unknown chapter "{key}" — {len(cards)} cards skipped'); continue
    text = frag.read_text()
    last_no, last_m = 0, None
    for m in SEC.finditer(text):
        h = re.search(r'<h3>\{\{N\}\}\.(\d+)', m.group(0))
        if h and int(h.group(1)) >= last_no:
            last_no, last_m = int(h.group(1)), m
    toc = json.loads(tocf.read_text())
    ids = [s['id'] for s in toc['sections']]
    pos = ids.index(last_m.group(1)) + 1 if last_m and last_m.group(1) in ids else len(ids)
    out, entries = [], []
    for c in cards:
        cid = re.search(r'id="([^"]+)"', c).group(1)
        if f'id="{cid}"' in text:
            print(f'!! {cid} already in {key} — skipped'); continue
        last_no += 1
        c = re.sub(r'\{\{N\}\}\.X\b', f'{{{{N}}}}.{last_no}', c, count=1)
        title = re.sub(r'<[^>]+>|\{\{N\}\}\.\d+\s*|🆕|✎ (sửa|bổ sung)', '',
                       re.search(r'<h3>(.*?)</h3>', c, re.S).group(1)).replace('&amp;', '&').strip()
        out.append(c); entries.append({'id': cid, 'title': title})
        print(f'{key:8s} {{N}}.{last_no:<3d} {cid:14s} {title[:60]}')
    if dry or not out:
        continue
    at = last_m.end() if last_m else len(text)
    frag.write_text(text[:at] + '\n\n' + '\n\n'.join(out) + '\n' + text[at:])
    toc['sections'][pos:pos] = entries
    tocf.write_text(json.dumps(toc, ensure_ascii=False))

if not dry:
    r = subprocess.run([sys.executable, str(HERE / 'assemble.py')], capture_output=True, text=True)
    print(r.stdout.strip() or r.stderr.strip())
