"""Strip web-article noise from exported pages before Claude reads them (saves ~20–30% tokens).

Usage:  python3 clean_page.py inbox/*.md        (rewrites each file in place, prints savings)
Removes: ads/promo lines (ELSA, ZIM, WhatsApp, "Xem thêm", "Có thể bạn quan tâm"…), pronunciation
widgets, table-of-contents markers, link targets " <http…>", bare [IMAGE #n] markers (image URLs stay
in the footer), image-alt lines that just repeat a heading, reference lists at the end, and repeated
blank lines. Headers (TITLE/ID/URL/IMAGES) and the IMAGE URLS footer are kept.
"""
import re, sys
from pathlib import Path

DROP = re.compile(r'|'.join([
    r'elsa ?speak', r'\belsa\b', r'zim\.vn', r'\bZIM Academy\b', r'whatsapp', r'skype',
    r'^\s*(>>\s*)?xem thêm', r'có thể bạn quan tâm', r'click to start recording', r'kiểm tra phát âm',
    r'this summer i will visit a new country', r'học tiếng anh 1 kèm 1', r'chỉ hôm nay',
    r'premium', r'đăng ký (elsa|ngay|học)', r'don[’\']t hesitate to', r'book an online', r'chat on',
    r'^\s*\[table_of_contents\]', r'^\s*zim\.vn\s*$', r'bấm vào|click vào đây', r'tải (app|ứng dụng)',
    r'^\s*\[IMAGE #\d+\]\s*$', r'^\s*---\s*$',
]), re.I)
END_SECTIONS = re.compile(r'^#*\s*\**\s*(tài liệu tham khảo|references?|nguồn tham khảo)\b', re.I)

total_before = total_after = 0
for f in map(Path, sys.argv[1:]):
    text = f.read_text()
    head, sep, footer = text.partition('\nIMAGE URLS:')
    lines, out, headings, in_refs = head.split('\n'), [], set(), False
    for i, line in enumerate(lines):
        if i < 5 and re.match(r'^(TITLE|ID|URL|IMAGES|TAGS|CREATED):', line):
            out.append(line); continue
        if END_SECTIONS.match(line.strip()):
            in_refs = True
        if in_refs:
            if re.match(r'^#{1,2} ', line) and not END_SECTIONS.match(line.strip()):
                in_refs = False          # a new real section starts
            else:
                continue
        if DROP.search(line):
            continue
        line = re.sub(r' <https?://[^>]+>', '', line)
        bare = re.sub(r'[#*\s]+', ' ', line).strip().lower()
        if line.lstrip().startswith('#'):
            headings.add(bare)
        elif bare and bare in headings and len(bare) < 120:   # image alt repeating a heading
            continue
        if not line.strip() and out and not out[-1].strip():
            continue
        out.append(line.rstrip())
    new = '\n'.join(out).strip() + '\n' + (sep + footer if sep else '')
    total_before += len(text); total_after += len(new)
    f.write_text(new)
    print(f'{f.name}: {len(text)} → {len(new)} chars ({100 - 100 * len(new) // max(len(text), 1)}% less)')
if len(sys.argv) > 2:
    print(f'TOTAL: {total_before} → {total_after} chars ({100 - 100 * total_after // max(total_before, 1)}% less)')
