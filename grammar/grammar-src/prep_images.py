"""Cheap image pipeline: dedupe → skip covers → local OCR → per-page transcript + review list.

Usage (run OUTSIDE the sandbox — macOS Vision is blocked inside it):
    python3 prep_images.py img/165_*.png            # or: python3 prep_images.py img/*
Writes:
    ocr_out/<page>.md          transcript per Notion page (images in order, duplicates referenced)
    ocr_out/review.txt         images the model should still LOOK at (low confidence / little text)
Then the model reads ocr_out/*.md (text, ~4x cheaper than images) and only Reads the images in review.txt.
"""
import hashlib, re, subprocess, sys
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).parent
OCR_BIN = HERE / 'ocr'
MIN_CHARS = 40          # less text than this → probably a cover/title card or a picture
MIN_CONF = 0.60         # mean Vision confidence below this → have the model look at it

files = sorted(Path(p) for p in sys.argv[1:] if not p.endswith('.txt'))
if not files:
    sys.exit(__doc__)

# 1. exact duplicates (same bytes) — OCR/read only the first copy
first_by_hash, dup_of = {}, {}
for f in files:
    h = hashlib.md5(f.read_bytes()).hexdigest()
    if h in first_by_hash:
        dup_of[f] = first_by_hash[h]
    else:
        first_by_hash[h] = f
unique = [f for f in files if f not in dup_of]

# 2. truncated PNG downloads — must be re-downloaded, not read
truncated = [f for f in unique if f.suffix == '.png' and not f.read_bytes()[-12:].endswith(b'IEND\xaeB`\x82')]

# 3. OCR in batches
stats = {}
todo = [f for f in unique if f not in truncated]
for i in range(0, len(todo), 40):
    out = subprocess.run([str(OCR_BIN), *map(str, todo[i:i + 40])], capture_output=True, text=True).stdout
    for line in out.splitlines():
        path, chars, conf = line.split('\t')
        stats[Path(path)] = (int(chars), float(conf) if conf != 'ERROR' else 0.0)

# 4. per-page transcripts + review list
out_dir = HERE / 'ocr_out'
out_dir.mkdir(exist_ok=True)
pages, review = defaultdict(list), []
for f in files:
    page = re.match(r'(\d+)_', f.name).group(1) if re.match(r'\d+_', f.name) else f.stem
    if f in dup_of:
        pages[page].append(f'## {f.name}\n(same image as {dup_of[f].name} — skipped)\n')
    elif f in truncated:
        pages[page].append(f'## {f.name}\n(TRUNCATED DOWNLOAD — re-download before use)\n')
    else:
        chars, conf = stats.get(f, (0, 0.0))
        text = Path(str(f) + '.txt').read_text() if chars else ''
        flag = ''
        if chars < MIN_CHARS:
            flag = 'little text — cover/picture? LOOK only if the page needs it'
        elif conf < MIN_CONF:
            flag = f'low OCR confidence {conf:.2f} — LOOK at the image'
        if flag:
            review.append(f'{f}\t{flag}')
        pages[page].append(f'## {f.name}  (ocr conf {conf:.2f}{"; " + flag if flag else ""})\n{text}\n')

for page, parts in pages.items():
    (out_dir / f'{page}.md').write_text('\n'.join(parts))
(out_dir / 'review.txt').write_text('\n'.join(review) + ('\n' if review else ''))

print(f'images {len(files)} | duplicates {len(dup_of)} | truncated {len(truncated)} | '
      f'OCRed {len(stats)} | need a look {len(review)}')
print(f'transcripts: {out_dir}/<page>.md   review list: {out_dir}/review.txt')
if truncated:
    print('TRUNCATED:', ' '.join(map(str, truncated)))
