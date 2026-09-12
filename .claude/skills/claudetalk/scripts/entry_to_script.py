#!/usr/bin/env python3
"""Convert a Claude Talk entry (HTML) into a TTS-ready narration script (.txt),
for the dedicated claude-talk/audio/ folder.

Usage: python3 entry_to_script.py <path-to-entry.html> <path-to-output.txt>

Design notes (see .claude/skills/claudetalk/SKILL.md for the full context):

- Claude Talk entries are free-form prose, not Wetwear's labeled-section
  structure and not Dead Men on Thrones' single continuous narrative with a
  fixed chapter-number header, so this script's framing is the simplest of
  the three: just a title line, a written-on line, and the body.
- Unlike Wetwear and Dead Men on Thrones, Claude Talk has never been put
  under the site's "no em dashes" rule, so this script does not hard-fail
  on one. If a stray em dash shows up it's read fine by most TTS engines as
  a pause, so it's left alone rather than treated as an error.
- The 400-character sentence limit applies ONLY to this .txt output, the
  same convention as the other two converters. The source HTML page itself
  is untouched and may legitimately run longer.
"""
import os
import re
import sys

# ---------------------------------------------------------------------------
# Number-to-words helpers, ported from dmot-chapter/scripts/chapter_to_script.py
# (itself ported from wetwear-brief/scripts/html_to_script.py). Kept as a
# self-contained copy, not a cross-skill import, per this project's existing
# convention of each skill's scripts being independent.
# ---------------------------------------------------------------------------

_ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']
_TEENS = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
          'seventeen', 'eighteen', 'nineteen']
_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
_SCALES = ['', 'thousand', 'million', 'billion', 'trillion']
_DIGIT_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']


def _two_digit_words(n):
    if n < 10:
        return _ONES[n]
    if n < 20:
        return _TEENS[n - 10]
    tens, ones = divmod(n, 10)
    return _TENS[tens] + ('-' + _ONES[ones] if ones else '')


def _three_digit_words(n):
    hundreds, rest = divmod(n, 100)
    parts = []
    if hundreds:
        parts.append(_ONES[hundreds] + ' hundred')
    if rest:
        parts.append(_two_digit_words(rest))
    return ' '.join(parts)


def int_to_words(n):
    if n == 0:
        return 'zero'
    negative = n < 0
    n = abs(n)
    chunks = []
    i = 0
    while n > 0:
        n, chunk = divmod(n, 1000)
        if chunk:
            chunks.append((chunk, i))
        i += 1
    words = []
    for chunk, scale_idx in reversed(chunks):
        words.append(_three_digit_words(chunk))
        if _SCALES[scale_idx]:
            words.append(_SCALES[scale_idx])
    result = ' '.join(words)
    return ('negative ' + result) if negative else result


def digits_to_words(digit_str):
    return ' '.join(_DIGIT_WORDS[int(d)] for d in digit_str)


def year_to_words(year_str):
    """Spell out a year the way it's spoken. Broadened (like the DMOT
    version) to cover 3- or 4-digit years, not just modern 19xx/20xx ones,
    since a Claude Talk piece could plausibly reference any date."""
    y = int(year_str)
    if 2000 <= y <= 2009:
        remainder = y - 2000
        return 'two thousand' + ((' ' + _ONES[remainder]) if remainder else '')
    if 1000 <= y <= 9999:
        first_two = y // 100
        last_two = y % 100
        first_words = _two_digit_words(first_two)
        if last_two == 0:
            return first_words + ' hundred'
        last_words = _two_digit_words(last_two) if last_two >= 10 else 'oh ' + _ONES[last_two]
        return first_words + ' ' + last_words
    if 100 <= y <= 999:
        first_digit = y // 100
        last_two = y % 100
        first_word = _ONES[first_digit]
        if last_two == 0:
            return first_word + ' hundred'
        last_words = _two_digit_words(last_two) if last_two >= 10 else 'oh ' + _ONES[last_two]
        return first_word + ' ' + last_words
    return int_to_words(y)


def _decimal_to_words(match):
    whole, frac = match.group(1), match.group(2)
    whole_words = int_to_words(int(whole)) if whole else 'zero'
    return f'{whole_words} point {digits_to_words(frac)}'


def _dollar_to_words(match):
    whole = match.group('whole').replace(',', '')
    frac = match.group('frac')
    scale_word = match.group('scale')
    whole_words = int_to_words(int(whole))
    if frac:
        result = f'{whole_words} point {digits_to_words(frac)}'
    else:
        result = whole_words
    if scale_word:
        result += f' {scale_word.lower()}'
    return result + ' dollars'


_DOLLAR_RE = re.compile(
    r'\$(?P<whole>\d{1,3}(?:,\d{3})*|\d+)(?:\.(?P<frac>\d+))?'
    r'(?:\s?(?P<scale>billion|million|thousand))?',
    re.IGNORECASE,
)
_DECIMAL_RE = re.compile(r'(?<![\d$])(\d+)\.(\d+)(?!\d)')
_PERCENT_DECIMAL_RE = re.compile(r'(?<![\d$])(\d+)\.(\d+)\s*%')
_PERCENT_INT_RE = re.compile(r'(?<![\d$.])(\d+)\s*%')
_YEAR_RE = re.compile(r'(?<![\d.,$])\b([1-9]\d{2}|1\d{3}|20\d{2})\b(?!,\d{3})(?!\.\d)')
_DOMAIN_RE = re.compile(r'\b(?:[a-zA-Z0-9-]+\.)+(?:com|org|gov|net|edu|io|co|ai)\b')

_ABBREVIATIONS = [
    (re.compile(r'\bJr\.'), 'Junior'),
    (re.compile(r'\bSr\.'), 'Senior'),
    (re.compile(r'\bDr\.'), 'Doctor'),
    (re.compile(r'\bSen\.'), 'Senator'),
    (re.compile(r'\bRep\.'), 'Representative'),
]

_MONTHS = ('January|February|March|April|May|June|July|August|September|'
           'October|November|December')
_ORDINAL_DATE_RE = re.compile(rf'\b({_MONTHS}) (\d{{1,2}})\b(?!(?:st|nd|rd|th))')


def _ordinal_suffix(day):
    day = int(day)
    if 11 <= day % 100 <= 13:
        return 'th'
    return {1: 'st', 2: 'nd', 3: 'rd'}.get(day % 10, 'th')


def apply_tts_number_formatting(text):
    text = _DOLLAR_RE.sub(_dollar_to_words, text)
    text = _PERCENT_DECIMAL_RE.sub(
        lambda m: f'{int_to_words(int(m.group(1)))} point {digits_to_words(m.group(2))} percent', text)
    text = _PERCENT_INT_RE.sub(lambda m: f'{int_to_words(int(m.group(1)))} percent', text)
    text = _DECIMAL_RE.sub(_decimal_to_words, text)
    text = _ORDINAL_DATE_RE.sub(lambda m: f'{m.group(1)} {m.group(2)}{_ordinal_suffix(m.group(2))}', text)
    text = _YEAR_RE.sub(lambda m: year_to_words(m.group(0)), text)
    text = _DOMAIN_RE.sub(lambda m: m.group(0).replace('.', ' dot '), text)
    for pattern, replacement in _ABBREVIATIONS:
        text = pattern.sub(replacement, text)
    return text


# ---------------------------------------------------------------------------
# Entry-specific parsing (new; no equivalent in the other two converters,
# since this one reads HTML rather than markdown).
# ---------------------------------------------------------------------------

_TAG_RE = re.compile(r'<[^>]+>')


def _strip_tags(html_fragment):
    text = re.sub(r'<br\s*/?>', '\n', html_fragment, flags=re.IGNORECASE)
    text = _TAG_RE.sub('', text)
    text = (text.replace('&amp;', '&').replace('&mdash;', ', ')
                .replace('&ndash;', ' to ').replace('&larr;', '')
                .replace('&nbsp;', ' ').replace('&quot;', '"')
                .replace('&#39;', "'").replace('&rsquo;', "'")
                .replace('&lsquo;', "'").replace('&rdquo;', '"')
                .replace('&ldquo;', '"'))
    return re.sub(r'[ \t]+', ' ', text).strip()


def parse_entry(html):
    title_match = re.search(r'<h1 class="headline">(.*?)</h1>', html, re.DOTALL)
    byline_match = re.search(r'<p class="byline">Written (.*?)</p>', html, re.DOTALL)
    main_match = re.search(r'<main class="content" id="content">(.*?)</main>', html, re.DOTALL)
    if not title_match or not main_match:
        raise ValueError('Could not find both the <h1 class="headline"> title and '
                          'the <main class="content"> body.')

    title = _strip_tags(title_match.group(1))
    written_on = _strip_tags(byline_match.group(1)) if byline_match else ''
    body_html = main_match.group(1)

    # Split into top-level blocks (<p>...</p> and <h2>...</h2>), in document order.
    blocks = re.findall(r'<h2>.*?</h2>|<p>.*?</p>', body_html, re.DOTALL)
    parsed = []
    for block in blocks:
        is_heading = block.startswith('<h2>')
        inner = re.sub(r'^<h2>|</h2>$|^<p>|</p>$', '', block).strip()
        text = _strip_tags(inner)
        if text:
            parsed.append((is_heading, text))
    return title, written_on, parsed


_SENT_SPLIT_RE = re.compile(r'(?<=[.!?])"?\s+(?=[A-Z])')
_CONJ_RE = re.compile(r',\s+(and|but|because|which|who|since|while|though|so)\s+')


def _cap(s):
    s = s.strip()
    return (s[:1].upper() + s[1:]) if s else s


def _terminate(s):
    s = s.strip()
    if s and s[-1] not in '.!?':
        s += '.'
    return s


def _split_long_sentence(sentence, limit=400):
    """Best-effort split of an over-limit sentence for the .txt narration
    script only. Tries, in order: semicolons; a comma before a coordinating
    conjunction nearest the sentence's midpoint; the plain comma nearest the
    midpoint. Returns (list_of_pieces, still_too_long_bool)."""
    if len(sentence) <= limit:
        return [sentence], False

    if ';' in sentence:
        raw_parts = [p for p in sentence.split(';') if p.strip()]
        pieces = [_cap(_terminate(p)) for p in raw_parts]
        out, still_long = [], False
        for p in pieces:
            sub, bad = _split_long_sentence(p, limit)
            out.extend(sub)
            still_long = still_long or bad
        return out, still_long

    conj_matches = list(_CONJ_RE.finditer(sentence))
    if conj_matches:
        midpoint = len(sentence) / 2
        m = min(conj_matches, key=lambda m: abs(m.start() - midpoint))
        first = sentence[:m.start()]
        conj_word = m.group(1)
        rest = sentence[m.end():]
        second = conj_word[:1].upper() + conj_word[1:] + ' ' + rest
        pieces = [_cap(_terminate(first)), _cap(_terminate(second))]
        out, still_long = [], False
        for p in pieces:
            sub, bad = _split_long_sentence(p, limit)
            out.extend(sub)
            still_long = still_long or bad
        return out, still_long

    commas = [i for i, ch in enumerate(sentence) if ch == ',']
    if commas:
        midpoint = len(sentence) / 2
        idx = min(commas, key=lambda i: abs(i - midpoint))
        first, second = sentence[:idx], sentence[idx + 1:]
        pieces = [_cap(_terminate(first)), _cap(_terminate(second))]
        out, still_long = [], False
        for p in pieces:
            sub, bad = _split_long_sentence(p, limit)
            out.extend(sub)
            still_long = still_long or bad
        return out, still_long

    return [sentence], True


def split_paragraph_for_audio(paragraph, limit=400, warnings=None):
    sentences = _SENT_SPLIT_RE.split(paragraph.strip())
    out_sentences = []
    for sentence in sentences:
        pieces, still_long = _split_long_sentence(sentence, limit)
        out_sentences.extend(pieces)
        if still_long and warnings is not None:
            warnings.append(pieces[-1] if pieces else sentence)
    return ' '.join(out_sentences)


def convert(path, outpath):
    with open(path, encoding='utf-8') as f:
        html = f.read()

    title, written_on, blocks = parse_entry(html)

    warnings = []
    clean_blocks = []
    for is_heading, text in blocks:
        text = apply_tts_number_formatting(text)
        if not is_heading:
            text = split_paragraph_for_audio(text, warnings=warnings)
        clean_blocks.append((is_heading, text))

    out = ['Claude Talk.', '', f'{title}.']
    if written_on:
        out.append(f'Written {apply_tts_number_formatting(written_on)}.')
    out.append('')
    for is_heading, text in clean_blocks:
        out.append(text)
        out.append('')

    full_text = '\n'.join(out).strip() + '\n'

    outdir = os.path.dirname(outpath)
    if outdir:
        os.makedirs(outdir, exist_ok=True)

    with open(outpath, 'w', encoding='utf-8') as f:
        f.write(full_text)

    if warnings:
        print(f'WARNING: {len(warnings)} sentence(s) could not be split under '
              f'400 characters and were left as-is. Review by hand:')
        for w in warnings:
            print(f'  > {w}')

    return outpath


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print('Usage: python3 entry_to_script.py <path-to-entry.html> <path-to-output.txt>')
        sys.exit(1)
    convert(sys.argv[1], sys.argv[2])
