"""Find duplicate / already-processed pages BEFORE Claude reads them.

Usage:
    python3 dedupe_pages.py inbox/*.md            # report only
    python3 dedupe_pages.py --record inbox/*.md   # after a job: add pages to processed_pages.json
                                                  # and their text fingerprints to fingerprints.json
Checks, per page:
  * ID already in processed_pages.json                     → SKIP (already in the handbook)
  * text ≥ 60% similar to a processed page (fingerprints)  → SKIP (same article saved again)
  * title ≥ 85% similar to a processed title               → CHECK (maybe the same article)
  * text ≥ 60% similar to another page in this batch       → DUPLICATE of that page (read one only)
Similarity = Jaccard overlap of 5-word shingles (hashed); no model tokens needed.
"""
import difflib, hashlib, json, re, sys
from pathlib import Path

HERE = Path(__file__).parent
PROC, FP = HERE / 'processed_pages.json', HERE / 'fingerprints.json'
record = '--record' in sys.argv
files = [Path(a) for a in sys.argv[1:] if a != '--record']


def parse(f):
    t = f.read_text()
    title = re.search(r'^TITLE: (.*)$', t, re.M)
    pid = re.search(r'^ID: (.*)$', t, re.M)
    body = t.split('\nIMAGE URLS:')[0]
    body = re.sub(r'^(TITLE|ID|URL|IMAGES|TAGS|CREATED):.*$', '', body, flags=re.M)
    return (title.group(1).strip() if title else f.stem), (pid.group(1).strip() if pid else ''), body


def shingles(text):
    w = re.findall(r'\w+', text.lower())
    return {int(hashlib.md5(' '.join(w[i:i + 5]).encode()).hexdigest()[:8], 16) for i in range(max(len(w) - 4, 0))}


def jac(a, b):
    return len(a & b) / len(a | b) if a and b else 0.0


processed = json.loads(PROC.read_text()) if PROC.exists() else []
fps = json.loads(FP.read_text()) if FP.exists() else {}
proc_ids = {p['id'].replace('-', '') for p in processed}
proc_titles = [(p['title'], p['id']) for p in processed if p.get('title')]

pages = []
for f in files:
    title, pid, body = parse(f)
    pages.append({'file': f, 'title': title, 'id': pid, 'sh': shingles(body), 'chars': len(body)})

read_list, skipped = [], 0
for i, p in enumerate(pages):
    verdict = 'NEW'
    if p['id'] and p['id'].replace('-', '') in proc_ids:
        verdict = 'SKIP  already processed (same Notion id)'
    else:
        sample = set(sorted(p['sh'])[:400])          # same bottom-400 sample as stored fingerprints
        best = max(((jac(sample, set(v['sh'])), v['title']) for v in fps.values()), default=(0, ''))
        if best[0] >= 0.6:
            verdict = f'SKIP  {best[0]:.0%} same text as processed page “{best[1][:50]}”'
        else:
            for q in pages[:i]:
                s = jac(p['sh'], q['sh'])
                if s >= 0.6:
                    verdict = f'DUPLICATE {s:.0%} of {q["file"].name}'; break
            else:
                t = max(((difflib.SequenceMatcher(None, p['title'].lower(), pt.lower()).ratio(), pt)
                         for pt, _ in proc_titles), default=(0, ''))
                if p['title'] and t[0] >= 0.85:
                    verdict = f'CHECK title {t[0]:.0%} like processed “{t[1][:50]}”'
    if verdict.startswith(('SKIP', 'DUPLICATE')):
        skipped += 1
    else:
        read_list.append(p['file'].name)
    print(f'{p["file"].name:45s} {p["chars"]:6d} chars  {verdict}')

print(f'\n{len(pages)} pages: read {len(read_list)}, skip {skipped}')

if record:
    for p in pages:
        if p['id'] and p['id'].replace('-', '') not in proc_ids:
            processed.append({'idx': len(processed), 'id': p['id'], 'title': p['title']})
            proc_ids.add(p['id'].replace('-', ''))
        key = p['id'] or p['file'].stem
        fps[key] = {'title': p['title'], 'sh': sorted(p['sh'])[:400]}   # sample keeps file small
    PROC.write_text(json.dumps(processed, ensure_ascii=False, indent=0))
    FP.write_text(json.dumps(fps, ensure_ascii=False))
    print(f'recorded → {PROC.name} ({len(processed)} pages), {FP.name} ({len(fps)} fingerprints)')
