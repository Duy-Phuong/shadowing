"""Turn notion_extract.js output into inbox/*.md files (one per page) — no model reading needed.

Usage:
    python3 save_export.py <tool-results file or .json> [more files...]
The input is what `JSON.stringify(__export)` returned: either a raw JSON list, or the
tool-results wrapper Claude Code saves for large outputs (a JSON-encoded string inside
[{"type":"text","text":...}]). Writes inbox/<nn>_<slug>.md with a header:
    TITLE: … / ID: … / URL: … / IMAGES: n  then the page text, then the image URL list.
"""
import json, re, sys, unicodedata
from pathlib import Path

INBOX = Path(__file__).parent / 'inbox'


def load(path):
    raw = Path(path).read_text()
    data = json.loads(raw)
    if isinstance(data, list) and data and isinstance(data[0], dict) and 'type' in data[0]:
        text = data[0]['text']
        data, _ = json.JSONDecoder().raw_decode(text)      # outer JSON string
    while isinstance(data, str):
        data = json.loads(data)
    return data


def slug(s):
    s = unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')[:40] or 'untitled'


INBOX.mkdir(exist_ok=True)
start = len(list(INBOX.glob('*.md')))
n = 0
for f in sys.argv[1:]:
    for p in load(f):
        n += 1
        name = INBOX / f'{start + n:03d}_{slug(p.get("title", ""))}.md'
        imgs = p.get('imgs', [])
        name.write_text(
            f"TITLE: {p.get('title', '')}\nID: {p['id']}\n"
            f"URL: https://phuongdocs.notion.site/{p['id'].replace('-', '')}\nIMAGES: {len(imgs)}\n\n"
            f"{p.get('md', '')}\n\nIMAGE URLS:\n" +
            '\n'.join(f"#{i + 1} {x['url']}\tblock={x.get('block', '')}" for i, x in enumerate(imgs)))
print(f'wrote {n} pages to {INBOX}/')
