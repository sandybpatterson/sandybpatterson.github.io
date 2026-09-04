import re
import sys
import html

# ---------------------------------------------------------------------------
# Number-to-words helpers (no external dependencies).
# Used to make the narration script read numbers, dollar amounts, years, and
# decimals the way a person would actually say them out loud, per the site's
# TTS formatting rules (see SKILL.md).
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
    """Spell out an integer the way it's naturally said aloud."""
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
    """Read a string of digits one at a time, e.g. '53' -> 'five three'."""
    return ' '.join(_DIGIT_WORDS[int(d)] for d in digit_str)


def year_to_words(year_str):
    """Spell out a 4-digit year the way it's spoken, e.g. 2026 -> 'twenty twenty-six'."""
    y = int(year_str)
    if 2000 <= y <= 2009:
        # 2000 -> "two thousand", 2005 -> "two thousand five"
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


# $5,400 / $3.5 billion / $200 / $18,445 -- dollar amounts, spelled out fully.
_DOLLAR_RE = re.compile(
    r'\$(?P<whole>\d{1,3}(?:,\d{3})*|\d+)(?:\.(?P<frac>\d+))?'
    r'(?:\s?(?P<scale>billion|million|thousand))?',
    re.IGNORECASE,
)

# Bare decimal numbers not already handled as dollars, e.g. 2.5, 71.5, 44.0
_DECIMAL_RE = re.compile(r'(?<![\d$])(\d+)\.(\d+)(?!\d)')

# Percentages, decimal or whole-number, e.g. 71.5% -> "seventy-one point five
# percent", 58% -> "fifty-eight percent".
_PERCENT_DECIMAL_RE = re.compile(r'(?<![\d$])(\d+)\.(\d+)\s*%')
_PERCENT_INT_RE = re.compile(r'(?<![\d$.])(\d+)\s*%')

# A bare 4-digit year (no leading $, no comma grouping, no decimal) in a
# plausible calendar-year range. Large counts in this publication's writing
# style are comma-grouped (e.g. "2,903 cases"), so this is a safe, narrow net.
_YEAR_RE = re.compile(r'(?<![\d.,$])\b(19|20)\d{2}\b(?!,\d{3})(?!\.\d)')

# Domains meant to be read as "word dot word", e.g. cdc.gov -> cdc dot gov,
# www.factcheck.org -> www dot factcheck dot org
_DOMAIN_RE = re.compile(
    r'\b(?:[a-zA-Z0-9-]+\.)+(?:com|org|gov|net|edu|io|co)\b'
)

# Common abbreviations that get sounded out letter-by-letter by TTS instead
# of read as words -- safe to expand unconditionally, unlike initialisms
# (FDA, CDC, WHO, HHS) which are already said as individual letters.
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
    """Apply every automatic TTS formatting rule to a chunk of narration text."""
    # Dollar amounts first, since "$3.5 billion" also matches the bare-decimal
    # pattern and we want the dollar reading to win.
    text = _DOLLAR_RE.sub(_dollar_to_words, text)
    # Percentages next, before the generic decimal rule consumes the number
    # and leaves a bare "%" behind.
    text = _PERCENT_DECIMAL_RE.sub(
        lambda m: f'{int_to_words(int(m.group(1)))} point {digits_to_words(m.group(2))} percent', text)
    text = _PERCENT_INT_RE.sub(lambda m: f'{int_to_words(int(m.group(1)))} percent', text)
    # Remaining bare decimals (measurements, etc.)
    text = _DECIMAL_RE.sub(_decimal_to_words, text)
    # Ordinal date suffixes: "August 29" -> "August 29th"
    text = _ORDINAL_DATE_RE.sub(lambda m: f'{m.group(1)} {m.group(2)}{_ordinal_suffix(m.group(2))}', text)
    # Bare calendar years: "2026" -> "twenty twenty-six"
    text = _YEAR_RE.sub(lambda m: year_to_words(m.group(0)), text)
    # Domains meant to be read aloud: "cdc.gov" -> "cdc dot gov"
    text = _DOMAIN_RE.sub(lambda m: m.group(0).replace('.', ' dot '), text)
    # Name-suffix / title abbreviations
    for pattern, replacement in _ABBREVIATIONS:
        text = pattern.sub(replacement, text)
    return text


def check_no_em_dashes(label, text):
    """Hard gate: em dashes are banned site-wide, in both HTML and the .txt.
    Fail loudly rather than guessing a silent replacement, since the right
    replacement (a period, a comma, a rewritten clause) depends on the
    sentence and should be fixed in the source HTML, not patched here."""
    if '—' in text or '--' in text:
        raise ValueError(
            f'Em dash found in {label}. Em dashes are banned -- rework the '
            f'sentence in the source HTML (comma, colon, semicolon, or a new '
            f'sentence) and re-run this script. Offending text:\n{text}'
        )


_SENTENCE_SPLIT_RE = re.compile(r'(?<=[.!?])"?\s+(?=[A-Z])')


def check_sentence_length(label, text, limit=400):
    """Hard gate: no sentence over `limit` characters, in the HTML or the
    .txt. Long sentences should be split at the source in the HTML, not
    patched after the fact."""
    for sentence in _SENTENCE_SPLIT_RE.split(text.strip()):
        if len(sentence) > limit:
            raise ValueError(
                f'Sentence over {limit} characters in {label} '
                f'({len(sentence)} chars) -- split it in the source HTML and '
                f're-run this script. Offending sentence:\n{sentence}'
            )


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

    check_no_em_dashes('the headline', headline)
    check_no_em_dashes('the deck', deck)
    check_sentence_length('the headline', headline)
    check_sentence_length('the deck', deck)

    body_match = re.search(r'<div class="article-body">(.*?)<div class="closing">', content, re.S)
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
            intro = SECTION_INTROS.get(current_label, lambda src: f"Here's {current_label.lower()}")(biggest_story_source)
            lines.append('')
            lines.append(intro)
            lines.append('-' * len(current_label))
        elif part.startswith('<ul class="sources-list">'):
            break
        elif part.startswith('<p'):
            text = strip_tags(part)
            if text:
                check_no_em_dashes(f'a paragraph in the {current_label} section', text)
                check_sentence_length(f'a paragraph in the {current_label} section', text)
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

    full_text = '\n'.join(out).strip() + '\n'
    full_text = apply_tts_number_formatting(full_text)

    with open(outpath, 'w', encoding='utf-8') as f:
        f.write(full_text)

if __name__ == '__main__':
    convert(sys.argv[1], sys.argv[2], sys.argv[3])
