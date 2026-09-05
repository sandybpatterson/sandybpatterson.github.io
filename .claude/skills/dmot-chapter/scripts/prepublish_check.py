#!/usr/bin/env python3
"""Mechanical pre-publish scan for a Dead Men on Thrones chapter markdown file.

Bundles the purely mechanical checks from CLAUDE.md's MANDATORY PRE-PUBLISH
CHECKLIST (items 2's tic scan and item 3's stray-character scan), plus a word
count. Word count is reported for information only — it is NOT a pass/fail
gate. See CLAUDE.md's "Chapter length is earned, not targeted" note.

Usage: python3 prepublish_check.py <path-to-chapter.md>
"""
import re
import sys

# Known recurring tics/banned phrases as of this writing. This list is a
# convenience, not the source of truth — always cross-check the live
# CLAUDE.md BANNED PHRASES section and REVISION TODO notes too, since new
# entries get added there over time and this script won't know about them
# until it's updated.
TIC_PATTERNS = [
    r"what makes this genuinely interesting",
    r"what('s| is) genuinely interesting about this",
    r"\bis worth\b",
    r"\bit's worth\b",
    r"honest version of this (book|chapter)",
    r"worth (noting|flagging|sitting with|being|remembering|pausing|mentioning|weighing)",
    r"official reason",
    r"real reason",
    r"modern historians increasingly",
]

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 prepublish_check.py <path-to-chapter.md>")
        sys.exit(1)

    path = sys.argv[1]
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()

    words = len(text.split())
    print(f"=== {path} ===")
    print(f"Word count: {words}  (informational only — not a target. "
          f"See CLAUDE.md: 'Chapter length is earned, not targeted.')")
    print()

    print("--- Tic / banned-phrase scan ---")
    found_any = False
    for pattern in TIC_PATTERNS:
        for m in re.finditer(pattern, text, re.IGNORECASE):
            found_any = True
            line_no = text[:m.start()].count("\n") + 1
            line = text.splitlines()[line_no - 1].strip()
            print(f"  line {line_no}: matched /{pattern}/")
            print(f"    > {line}")
    if not found_any:
        print("  clean")
    print()

    print("--- Duplicate consecutive word scan ---")
    dup_matches = list(re.finditer(r"\b(\w+)\s+\1\b", text, re.IGNORECASE))
    if dup_matches:
        for m in dup_matches:
            line_no = text[:m.start()].count("\n") + 1
            print(f"  line {line_no}: repeated word '{m.group(1)}'")
    else:
        print("  clean")
    print()

    print("--- Stray non-ASCII character scan ---")
    # Allow the standard set of typographic characters this book actually uses,
    # plus common Latin-alphabet accented letters — this book's outline spans
    # French, Spanish, Italian, German, and Czech names and places (e.g.
    # Béziers, Rhône, Montségur in Ch. 24; more to come in Parts Four/Five/Seven),
    # so real diacritics are expected content, not encoding glitches.
    allowed = set("’‘“”—…·–")
    accented_latin = (
        "áàâäãåÁÀÂÄÃÅ"
        "éèêëÉÈÊË"
        "íìîïÍÌÎÏ"
        "óòôöõÓÒÔÖÕ"
        "úùûüÚÙÛÜ"
        "çÇñÑßØøÅå"
    )
    allowed |= set(accented_latin)
    stray_lines = {}
    for i, line in enumerate(text.splitlines(), start=1):
        for ch in line:
            if ord(ch) > 127 and ch not in allowed:
                stray_lines.setdefault(i, set()).add(ch)
    if stray_lines:
        for line_no, chars in stray_lines.items():
            print(f"  line {line_no}: unexpected character(s) {chars!r}")
    else:
        print("  clean")
    print()

    print("--- Section break count ---")
    breaks = len(re.findall(r"^---$", text, re.MULTILINE))
    print(f"  {breaks} '---' section breaks")
    print()

    print("--- Footer line check ---")
    if re.search(r"^DEAD MEN ON THRONES · CHAPTER", text, re.MULTILINE):
        print("  present")
    else:
        print("  MISSING — chapter is missing its closing attribution line")

if __name__ == "__main__":
    main()
