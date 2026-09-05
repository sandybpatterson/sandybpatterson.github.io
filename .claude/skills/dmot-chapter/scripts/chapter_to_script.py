#!/usr/bin/env python3
"""Convert a Dead Men on Thrones chapter (markdown) into a TTS-ready narration
script (.txt), for the dedicated audio/ folder.

Usage: python3 chapter_to_script.py <path-to-chNN.md> <path-to-output.txt>

Design notes (see .claude/skills/dmot-chapter/SKILL.md for the full context):

- Chapters are continuous narrative prose, not Wetwear's labeled-section
  structure, so there's no section-intro logic here the way
  wetwear-brief/scripts/html_to_script.py has. This script only strips
  markdown, formats numbers for speech, and enforces the .txt-only 400
  character sentence limit.
- Em dashes are now banned outright in all new chapter prose (see CLAUDE.md's
  "NO EM DASHES" section), not just in audio scripts. This script therefore
  treats any em dash as a hard error rather than silently fixing it -- if
  the source chapter passed dmot-chapter's prepublish_check.py, this should
  never actually fire. It's a safety net, not the primary enforcement.
- The 400-character sentence limit applies ONLY to this .txt output. The
  source markdown / the web page it renders to may have longer sentences;
  this script splits a copy of the text for narration purposes only and
  never touches the source file.
"""
import os
import re
import sys

# ---------------------------------------------------------------------------
# Number-to-words helpers, ported from wetwear-brief/scripts/html_to_script.py.
# Kept as a self-contained copy (not a cross-skill import) per this project's
# existing convention of each skill's scripts being independent.
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
    """Spell out a year the way it's spoken. Unlike wetwear-brief's version
    (which only ever sees modern 19xx/20xx years), this book's date range
    runs from the 1st century to the present, so 3-digit years (144, 313,
    897) need the same two-chunk treatment as 4-digit ones."""
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

# Broadened from wetwear-brief's 19xx/20xx-only pattern: this book's date
# range runs from the 1st century AD (e.g. "144", "313", "897") to the
# present, so match any plausible 3- or 4-digit year rather than only
# modern ones. Same guards against comma-grouped counts and decimals.
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
# Chapter-specific parsing (new; no wetwear-brief equivalent).
# ---------------------------------------------------------------------------

def check_no_em_dashes(label, text):
    if '—' in text:
        raise ValueError(
            f'Em dash found in {label}. Em dashes are banned in all new chapter '
            f'prose (see CLAUDE.md: NO EM DASHES) -- this should have been caught '
            f'by prepublish_check.py before this script ever ran. Fix the source '
            f'chapter .md, not this output. Offending text:\n{text}'
        )


def strip_markdown_emphasis(text):
    # **bold** -> bold, *italic* -> italic. Order matters: double before single.
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    return text


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
    """Best-effort split of an over-limit sentence into shorter ones, for the
    .txt narration script only. Tries, in order: semicolons; a comma before a
    coordinating conjunction nearest the sentence's midpoint; the plain comma
    nearest the midpoint. Returns (list_of_pieces, still_too_long_bool)."""
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


def parse_chapter(content):
    number_match = re.search(r'^# Chapter (.+)$', content, re.MULTILINE)
    title_match = re.search(r'^### (.+)$', content, re.MULTILINE)
    if not number_match or not title_match:
        raise ValueError('Could not find both "# Chapter ..." and "### Title" lines.')
    spelled_out_number = number_match.group(1).strip()
    title = title_match.group(1).strip()

    # Body is everything after the title line, minus the closing footer line.
    body = content[title_match.end():]
    body = re.sub(r'^DEAD MEN ON THRONES · CHAPTER .+ · SANDY B\. PATTERSON\s*$',
                  '', body, flags=re.MULTILINE)

    blocks = [b.strip() for b in re.split(r'\n\s*\n', body)]
    paragraphs = [b for b in blocks if b and b != '---']
    return spelled_out_number, title, paragraphs


def convert(path, outpath):
    with open(path, encoding='utf-8') as f:
        content = f.read()

    spelled_out_number, title, paragraphs = parse_chapter(content)

    check_no_em_dashes('the chapter title', title)

    clean_paragraphs = []
    warnings = []
    for para in paragraphs:
        para = strip_markdown_emphasis(para)
        check_no_em_dashes('a chapter paragraph', para)
        para = apply_tts_number_formatting(para)
        para = split_paragraph_for_audio(para, warnings=warnings)
        clean_paragraphs.append(para)

    out = []
    out.append('Dead Men on Thrones.')
    out.append('')
    out.append(f'Chapter {spelled_out_number}: {title}.')
    out.append('')
    out.extend(p for para in clean_paragraphs for p in (para, ''))

    full_text = '\n'.join(out).strip() + '\n'

    # The audio/ folder isn't tracked by git while empty, so a fresh clone
    # (or a new session) may not have it yet -- create it rather than fail.
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
        print('Usage: python3 chapter_to_script.py <path-to-chNN.md> <path-to-output.txt>')
        sys.exit(1)
    convert(sys.argv[1], sys.argv[2])
