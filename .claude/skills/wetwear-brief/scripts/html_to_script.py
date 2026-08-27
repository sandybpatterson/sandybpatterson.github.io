import re
import sys
import html

def strip_tags(s):
    s = re.sub(r'<[^>]+>', '', s)
    s = html.unescape(s)
    s = re.sub(r'[ \t]+', ' ', s)
    return s.strip()

SECTION_INTROS = {
    'BIGGEST STORY': lambda src: f'Here is the BIGGEST STORY from {src}',
    'BIOLOGY': lambda src: 'Here is the latest in BIOLOGY',
    'MISINFORMATION': lambda src: 'Here is the latest on MISINFORMATION',
    'PUBLIC HEALTH DATA': lambda src: "Here is today's PUBLIC HEALTH DATA",
    'POLITICS': lambda src: 'Here is the latest in POLITICS',
    'GOOD NEWS': lambda src: 'And finally, some GOOD NEWS',
}

def convert(path, outpath, biggest_story_source):
    with open(path, encoding='utf-8') as f:
        content = f.read()

    headline = strip_tags(re.search(r'<h1 class="headline">(.*?)</h1>', content, re.S).group(1))
    deck = strip_tags(re.search(r'<p class="deck">(.*?)</p>', content, re.S).group(1))
    byline = strip_tags(re.search(r'<p class="byline">(.*?)</p>', content, re.S).group(1))
    # byline is "Sandy B. Patterson · August 22, 2026"
    name, date = [p.strip() for p in byline.split('\xb7')] if '\xb7' in byline else [p.strip() for p in byline.split('&middot;')]

    body_match = re.search(r'<div class="article-body">(.*?)</div>\s*\n\s*</div>', content, re.S)
    body_html = body_match.group(1)

    parts = re.split(r'(<p class="section-label">.*?</p>|<ul class="sources-list">.*?</ul>|<p(?: class="drop-cap")?>.*?</p>)', body_html, flags=re.S)
    lines = []
    current_label = None
    for part in parts:
        part = part.strip()
        if not part:
            continue
        if part.startswith('<p class="section-label">'):
            current_label = strip_tags(part).upper()
            if current_label == 'SOURCES':
                break  # forget the sources section entirely
            intro = SECTION_INTROS.get(current_label, lambda src: f'Here is {current_label}')(biggest_story_source)
            lines.append('')
            lines.append(intro)
            lines.append('-' * len(current_label))
        elif part.startswith('<ul class="sources-list">'):
            break
        elif part.startswith('<p'):
            text = strip_tags(part)
            if text:
                lines.append('')
                lines.append(text)

    out = []
    out.append('Coming up on Wetwear: Biology Corrected.')
    out.append('')
    out.append(headline)
    out.append(deck)
    out.append(f'I am {name}, and today is {date}.')
    out.append('')
    out.append('=' * len(headline))
    out.extend(lines)
    out.append('')

    with open(outpath, 'w', encoding='utf-8') as f:
        f.write('\n'.join(out).strip() + '\n')

if __name__ == '__main__':
    convert(sys.argv[1], sys.argv[2], sys.argv[3])
