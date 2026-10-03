"""Find new / changed pages in the public Notion "English grammar" database and export them.
No browser, no model reading — just HTTPS requests to phuongdocs.notion.site's public API.

Usage (from grammar-src/):
    python3 check_notion.py                 # list new/changed pages, export them to inbox/, clean + dedupe
    python3 check_notion.py --list          # only list, export nothing
    python3 check_notion.py --with-images   # also download the pages' images to img/ and OCR them
                                            # (ask the user first: it prints the image count)
    python3 check_notion.py --reset-baseline  # mark everything currently in Notion as "seen"

State: notion_state.json keeps each page's last-edited time, so pages edited in Notion after they
were processed show up as CHANGED. Pages count as processed when their id is in processed_pages.json
(dedupe_pages.py --record adds them after a job).
In Claude Code's sandbox run with allowed_domains: phuongdocs.notion.site (+ img.notionusercontent.com,
prod-files-secure.s3.us-west-2.amazonaws.com for --with-images); OCR needs dangerouslyDisableSandbox.
"""
import json, os, re, ssl, subprocess, sys, unicodedata, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).parent
SITE = 'https://phuongdocs.notion.site'
SPACE = '5404e5ec-e304-4fad-bebe-7f816b5a589d'
DB = {'collection': '079662eb-b9d7-4323-b12b-d33f268fd05a', 'view': '0896b6f5-29ad-4ac5-a80b-44fb64f51300'}
PROC, STATE, INBOX, IMG = HERE / 'processed_pages.json', HERE / 'notion_state.json', HERE / 'inbox', HERE / 'img'
args = set(sys.argv[1:])

ctx = ssl.create_default_context()
if os.environ.get('NODE_EXTRA_CA_CERTS') and Path(os.environ['NODE_EXTRA_CA_CERTS']).exists():
    ctx.load_verify_locations(os.environ['NODE_EXTRA_CA_CERTS'])      # corporate TLS-inspection CA
opener = urllib.request.build_opener(urllib.request.HTTPSHandler(context=ctx))


def post(endpoint, body, tries=4):
    req = urllib.request.Request(f'{SITE}/api/v3/{endpoint}', json.dumps(body).encode(),
                                 {'content-type': 'application/json', 'user-agent': 'Mozilla/5.0'})
    for attempt in range(tries):
        try:
            with opener.open(req, timeout=60) as r:
                return json.load(r)
        except Exception:                      # dropped connection / truncated response → retry
            if attempt == tries - 1:
                raise
            import time; time.sleep(2 * (attempt + 1))


def V(rec):
    v = (rec or {}).get('value') or {}
    return v.get('value', v) if isinstance(v, dict) and 'value' in v and isinstance(v['value'], dict) else v


def rt(a):
    out = []
    for x in a or []:
        t = x[0]
        if t == '‣':
            continue
        for z in (x[1] if len(x) > 1 else []):
            if z[0] == 'b':
                t = f'**{t}**'
            elif z[0] == 'a':
                t += f' <{z[1]}>'
        out.append(t)
    return ''.join(out)


def list_database():
    j = post('queryCollection', {
        'collection': {'id': DB['collection']}, 'collectionView': {'id': DB['view']},
        'loader': {'type': 'reducer', 'reducers': {'collection_group_results': {'type': 'results', 'limit': 1000}},
                   'searchQuery': '', 'userTimeZone': 'Asia/Ho_Chi_Minh'}})
    ids = j['result']['reducerResults']['collection_group_results']['blockIds']
    pages = []
    for pid in ids:
        v = V(j['recordMap']['block'][pid])
        pages.append({'id': pid, 'title': rt((v.get('properties') or {}).get('title')),
                      'edited': v.get('last_edited_time', 0), 'created': v.get('created_time', 0)})
    return pages


def load_blocks(pid):
    blocks, cursor, n = {}, {'stack': []}, 0
    while True:
        j = post('loadPageChunk', {'pageId': pid, 'limit': 100, 'cursor': cursor, 'chunkNumber': n, 'verticalColumns': False})
        blocks.update((j.get('recordMap') or {}).get('block') or {})
        cursor, n = j.get('cursor') or {'stack': []}, n + 1
        if not cursor.get('stack') or n >= 40:
            return blocks


HEAD = {'header': '\n# ', 'sub_header': '\n## ', 'sub_sub_header': '\n### '}
PREFIX = {'bulleted_list': '- ', 'numbered_list': '1. ', 'to_do': '- [ ] ', 'toggle': '> ', 'quote': '| ',
          'callout': '[callout] ', 'text': ''}


def render(bid, blocks, depth, out, imgs):
    v = V(blocks.get(bid))
    if not v:
        return
    p, ind, typ = v.get('properties') or {}, '  ' * depth, v.get('type')
    T = rt(p.get('title'))
    if typ == 'image':
        src = (v.get('format') or {}).get('display_source') or ((p.get('source') or [['']])[0][0])
        proxied = 'attachment:' in src or 'amazonaws.com' in src
        url = (f'{SITE}/image/{urllib.parse.quote(src, safe="")}?table=block&id={bid}&spaceId={SPACE}&width=1300&cache=v2'
               if proxied else src)
        imgs.append({'block': bid, 'url': url})
        out.append(f'{ind}[IMAGE #{len(imgs)}]' + (f' caption: {rt(p["caption"])}' if p.get('caption') else ''))
    elif typ == 'table':
        order = (v.get('format') or {}).get('table_block_column_order') or []
        for rid in v.get('content') or []:
            rp = (V(blocks.get(rid)) or {}).get('properties') or {}
            out.append(ind + '| ' + ' | '.join(rt(rp.get(c)).replace('\n', ' / ') for c in order) + ' |')
        return
    elif typ in HEAD:
        out.append(HEAD[typ] + T)
    elif typ in PREFIX:
        out.append(ind + PREFIX[typ] + T)
    elif typ == 'code':
        out.append(f'```\n{T}\n```')
    elif typ == 'bookmark':
        out.append(f'{ind}[bookmark] {rt(p.get("link"))}')
    elif typ == 'page':
        out.append(f'{ind}[subpage] {T}')
        return
    elif typ not in ('column_list', 'column', 'divider'):
        out.append(f'{ind}[{typ}] {T}')
    flat = typ in ('column_list', 'column')
    for k in v.get('content') or []:
        render(k, blocks, depth if flat else depth + 1, out, imgs)


def export_page(page):
    blocks = load_blocks(page['id'])
    root = V(blocks.get(page['id'])) or {}
    out, imgs = [], []
    for k in root.get('content') or []:
        render(k, blocks, 0, out, imgs)
    return '\n'.join(out), imgs


def slug(s):
    s = unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')[:40] or 'untitled'


def day(ms):
    return datetime.fromtimestamp(ms / 1000, timezone.utc).strftime('%Y-%m-%d') if ms else '?'


# ---------------------------------------------------------------- main
pages = list_database()
if not pages:
    sys.exit('Notion returned 0 pages — the database is probably no longer published to the web '
             f'(open {SITE}/{DB["collection"][:0]}14c00a84968880f499dbe6f1bfbf1f53 to check). Nothing changed.')
processed = json.loads(PROC.read_text()) if PROC.exists() else []
proc_ids = {p['id'].replace('-', '') for p in processed}
state = json.loads(STATE.read_text()) if STATE.exists() else None

if state is None or '--reset-baseline' in args:
    # first run: remember current edit times of processed pages, so only future edits count as CHANGED
    state = {p['id']: p['edited'] for p in pages if p['id'].replace('-', '') in proc_ids or '--reset-baseline' in args}
    STATE.write_text(json.dumps(state, indent=0))
    if '--reset-baseline' in args:
        print(f'baseline reset: {len(state)} pages marked as seen'); sys.exit()

new = [p for p in pages if p['id'].replace('-', '') not in proc_ids]
changed = [p for p in pages if p['id'].replace('-', '') in proc_ids and p['id'] in state and p['edited'] > state[p['id']]]
print(f'{len(pages)} pages in Notion · {len(processed)} processed · {len(new)} new · {len(changed)} changed')
if not new and not changed:
    print('Nothing to do.'); sys.exit()

todo = [(p, 'NEW') for p in new] + [(p, 'CHANGED') for p in changed]
if '--list' in args:
    for p, kind in todo:
        print(f'{kind:8s} {p["title"][:60] or "(untitled)":60s} edited {day(p["edited"])}')
    sys.exit()

INBOX.mkdir(exist_ok=True)
start = len(list(INBOX.glob('*.md')))
with ThreadPoolExecutor(6) as ex:
    results = list(ex.map(lambda t: export_page(t[0]), todo))

written, all_imgs = [], []
for i, ((p, kind), (md, imgs)) in enumerate(zip(todo, results), 1):
    f = INBOX / f'{start + i:03d}_{slug(p["title"])}.md'
    f.write_text(f"TITLE: {p['title']}\nID: {p['id']}\nURL: {SITE}/{p['id'].replace('-', '')}\n"
                 f"IMAGES: {len(imgs)}\nSTATUS: {kind}\nEDITED: {day(p['edited'])}\n\n{md}\n\nIMAGE URLS:\n" +
                 '\n'.join(f"#{n + 1} {x['url']}\tblock={x['block']}" for n, x in enumerate(imgs)))
    written.append(f)
    all_imgs += [(f.stem.split('_')[0], n + 1, x['url']) for n, x in enumerate(imgs)]
    print(f'{kind:8s} {p["title"][:55] or "(untitled)":55s} {len(md):6d} chars  {len(imgs):2d} images → {f.name}')

print()
subprocess.run([sys.executable, str(HERE / 'clean_page.py'), *map(str, written)], stdout=subprocess.DEVNULL)
subprocess.run([sys.executable, str(HERE / 'dedupe_pages.py'), *map(str, written)])

# remember edit times, so these pages aren't reported as CHANGED again after they're processed
for p, _ in todo:
    state[p['id']] = p['edited']
STATE.write_text(json.dumps(state, indent=0))

if all_imgs and '--with-images' in args:
    IMG.mkdir(exist_ok=True)
    print(f'\ndownloading {len(all_imgs)} images …')

    def dl(item):
        page, n, url = item
        path = IMG / f'{page}_{n:02d}'
        req = urllib.request.Request(url, headers={'user-agent': 'Mozilla/5.0'})
        data = opener.open(req, timeout=90).read()
        ext = 'png' if data[:4] == b'\x89PNG' else 'jpg' if data[:2] == b'\xff\xd8' else 'webp' if data[8:12] == b'WEBP' else 'bin'
        path.with_suffix('.' + ext).write_bytes(data)
        return path.with_suffix('.' + ext)
    with ThreadPoolExecutor(8) as ex:
        files = list(ex.map(dl, all_imgs))
    subprocess.run([sys.executable, str(HERE / 'prep_images.py'), *map(str, files)])
elif all_imgs:
    print(f'\n{len(all_imgs)} images listed in the inbox files (not downloaded). '
          f'Re-run with --with-images to download + OCR them.')
print('\nNext: ask Claude to "add the inbox pages to the handbook".')
