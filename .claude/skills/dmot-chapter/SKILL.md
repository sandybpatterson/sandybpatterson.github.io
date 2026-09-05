---
name: dmot-chapter
description: Plans, fact-checks, drafts, and publishes a new chapter of "Dead Men on Thrones" (the nonfiction book in dead-men-on-thrones/ on the sandybpatterson.github.io site). Use whenever asked to write, draft, or plan "the next chapter," a specific chapter number, or a named chapter of Dead Men on Thrones. Stops after presenting the plan and fact-check summary and waits for explicit go-ahead before drafting or touching any file, unless the user has already said to draft straight through.
---

# Dead Men on Thrones — Chapter Writer

This skill runs the full chapter pipeline that has, up to this point, been done by
hand in conversation for all 23 published chapters: pick the chapter, plan it,
fact-check it, draft it, wire it into the site, verify it renders, extend the
appendices, and push it live. It exists to make that pipeline repeatable and to stop
small mechanical steps (word-count checks, tic scans, the DOM-render dance) from
being redone slightly differently — or skipped — each time.

**This skill is currently scoped to this one book.** Paths, the four-appendix-file
convention, and the Marcion-thread rule below are all specific to Dead Men on
Thrones. If this ever gets generalized to another book on the shelf, treat the
book-specific assumptions listed at the end of this file as exactly what needs to
become a parameter — don't guess at a generic shape before a second book actually
needs one.

Before doing anything else, read `dead-men-on-thrones/CLAUDE.md` in full if you
haven't already this session — specifically the outline entry for the target
chapter, `TONE AND VOICE`, `BANNED PHRASES`, the Marcion-framing note, both
`REVISION TODO` craft-notes sections, and the "Chapter length is earned, not
targeted" note under the pre-publish checklist. That file is the actual source of
truth for voice, standing rules, and progress state; this skill just sequences the
steps around it.

## 0. Determine the target chapter

- If the user named a chapter (number or title), use that — this book's own
  CLAUDE.md explicitly allows out-of-order drafting, so don't assume it has to be
  the next sequential number.
- Otherwise, read the `PROGRESS STATUS` section's "Next up" line.
- Either way, confirm against `chapter.html`'s `chapters` map and `index.html`'s TOC
  row: if the target chapter already has a file and is marked "Read," stop and ask
  the user whether they actually want it redrafted, rather than assuming and
  overwriting a published chapter.
- Read that chapter's own outline entry in `CLAUDE.md` (search for `Chapter N —`)
  for its required content beats.

## 1. Structural plan

Before any fact-checking, work out:

- **Redundancy against already-published chapters.** Skim recent chapters (and
  `grep` across all of them if the topic might overlap) for material this new
  chapter's outline entry might re-cover — the way Chapter 23 nearly re-narrated
  Chapter 22's Fourth Crusade material. If something's already been told in full,
  plan a one-line callback instead of repeating it.
- **The Marcion thread.** Per `CLAUDE.md`'s framing note, Marcion should surface at
  least lightly in every Part, not just Part One. Check whether this chapter is a
  natural place for that, and if so, sketch the specific, non-forced connection
  before drafting — not as an afterthought found while writing.
- **Device repetition.** Check the last 2–3 published chapters for any recurring
  analytical move (e.g. "official reason vs. real reason," a particular hedge
  phrasing like "modern historians increasingly stress") and deliberately avoid
  reusing the same one a third or fourth consecutive time. Vary the phrasing of
  recurring *true* observations (per the REVISION TODO notes) rather than retiring
  them outright.
- **What's deliberately out of scope.** If the outline's content beats overlap with
  a chapter that has its own dedicated later treatment (e.g. the Templars getting
  their own Chapter 25), say so explicitly and defer it rather than partially
  covering it here.
- **Length.** Do not set a word-count target. Sketch the beats and let the draft's
  length fall out of what they actually need — see the "length is earned" note in
  `CLAUDE.md`.

## 2. Fact-check

Use WebSearch to verify every specific, checkable claim this chapter will make —
dates, quotes, numbers, named sources, "first/only" superlatives — before treating
any of them as settled. Don't rely on recalled/training-data specifics for anything
checkable; this book has been burned before by asserting a detail (e.g. exactly
which five chroniclers recorded a speech) from memory instead of verifying it.
Note explicitly which claims are genuinely contested, and how the chapter will hedge
each one rather than deciding in the chapter's favor by default.

## 3. Present the plan and stop

Show the user: the structural plan from step 1, the redundancy/Marcion/device
decisions, and a summary of what step 2 confirmed or corrected. **Do not draft,
touch any file, or run any script past this point without an explicit go-ahead** —
"draft it," "go ahead," "push it," or equivalent. If the user's original request
already included that instruction up front (e.g. "write and publish chapter 25"),
you may treat that as the go-ahead and continue straight through steps 4–12 without
stopping here.

## 4. Draft

Write `dead-men-on-thrones/chapters/chNN.md` (zero-padded two-digit number) as
plain markdown, following the established shape:

```
# Chapter [Spelled-Out Number]

### [Chapter Title]

[Body paragraphs, ~150–400 words each, dramatized cold open, no meta-commentary
about "this book" or "the honest version of this chapter"; fold caveats into the
narrative instead of announcing them]

---

[more paragraphs, sections separated by --- ]

DEAD MEN ON THRONES · CHAPTER [SPELLED-OUT NUMBER] · SANDY B. PATTERSON
```

Match this book's established voice (see `TONE AND VOICE` in `CLAUDE.md`): specific
people and decisions rather than abstractions, real numbers hedged honestly where
contested, dry dark humor where the material earns it, no closing-line pattern
repeated from the immediately preceding chapters (vary between a withheld-detail
sting, a reflective capstone, and an open question, rather than defaulting to a
"here's what comes next" hand-off every time).

**No em dashes, effective 2026-09-05 — see the `NO EM DASHES` section in
`CLAUDE.md`.** This applies to every chapter drafted from now on; do not carry the
habit forward from Chapters 1–24, which used them freely and are not being
retrofitted as part of ordinary chapter-writing. Rework with a comma, colon,
semicolon, or a new sentence while drafting, rather than fixing it at the
pre-publish-check stage.

## 5. Automated pre-publish check

Run the bundled mechanical scan:

```
python3 .claude/skills/dmot-chapter/scripts/prepublish_check.py dead-men-on-thrones/chapters/chNN.md
```

This reports word count (informational only, never treat it as pass/fail),
scans for known recurring tics and banned phrases, em dashes (banned outright,
not just informational — see below), duplicate consecutive words, stray
non-ASCII characters, section-break count, and the closing attribution line.
Fix anything it flags, then re-run until clean. This script's tic list is a
convenience, not exhaustive; also re-check the live `BANNED PHRASES` section in
`CLAUDE.md` by eye, since new entries get added there over time.

An em dash flagged here on a **new** chapter (25 onward) is a real problem to
fix before publishing. An em dash flagged on any of Chapters 1–24, if this
script is ever run against them, is expected and not a bug to chase down; that
cleanup is separate, dedicated work for later, not something this pipeline
does incidentally.

## 6. Generate the audio script

**Chapter 25 onward only** — Chapters 1–24 don't get this retroactively; that's
separate cleanup-skill work for later, not something this step reaches back for.

```
python3 .claude/skills/dmot-chapter/scripts/chapter_to_script.py \
  dead-men-on-thrones/chapters/chNN.md \
  "dead-men-on-thrones/audio/ChNN - [Chapter Title].txt"
```

This produces a TTS-ready narration script in the flat `dead-men-on-thrones/audio/`
folder (created automatically if it doesn't exist yet). It strips markdown
formatting, drops the `# Chapter N` line and the closing attribution footer (only
`Dead Men on Thrones.` / `Chapter [N]: [Title].` opens the script; no repeated
"by Sandy B. Patterson" byline the way Wetwear's daily episodes have one — this
reads as a book chapter, not a recurring show), spells out numbers, years, dollar
amounts, and percentages for speech the same way `wetwear-brief`'s converter does,
and enforces the 400-character sentence limit **for this .txt file only** — the
web page's own text is untouched and may legitimately run longer. It has a
best-effort splitter for any sentence over that limit (semicolons first, then a
comma before a conjunction nearest the midpoint, then the nearest comma); anything
it truly can't split gets printed as a warning to review by hand, not silently left
broken.

This script hard-fails on any em dash, the same way `prepublish_check.py` does — if
step 5 passed clean, this should never actually trigger. If it does, fix the source
chapter, not this script's output.

## 7. Wire into the site

- Add the chapter to the `chapters` map in `dead-men-on-thrones/chapter.html`.
- In `dead-men-on-thrones/index.html`: flip that chapter's row from
  `Coming Soon` to `Read` (add the `ready` class), and increment the
  `.toc-label` count.

## 8. Verify the render

Run the bundled render check from the repo root:

```
bash .claude/skills/dmot-chapter/scripts/verify_render.sh NN
```

This copies `chapter.html` to a throwaway file, points it at a vendored local copy
of marked.js (the production page loads marked from a CDN this environment can't
always reach), serves it locally, dumps the rendered DOM via headless Chromium, and
confirms the chapter's content actually renders and the "not found" error state is
not showing. It cleans up its own temp files and server process on exit — do not
leave a `_verify_test_chapter.html` or similar file sitting in `dead-men-on-thrones/`
after this step; if the script errors out, check for and remove any of its `_verify_*`
temp files by hand before continuing. A PASS here is required before moving on; a
FAIL means something in step 7 is wrong, not a false alarm.

## 9. Extend the sources and index appendices

Add a matching entry to all four files, following the exact format of the most
recent chapter's entries (read a nearby example before writing a new one rather
than reconstructing the format from memory):

- `dead-men-on-thrones/DMOT_Notes_and_Sources.txt` — `CHAPTER [N] — [TITLE]` block
  with `PRIMARY SOURCES`, `MODERN SCHOLARSHIP`, and `WHERE THIS IS CONTESTED`
  sections, inserted before the `GENERAL BACKGROUND` section.
- `dead-men-on-thrones/sources.html` — the matching `<div class="chapter-block"
  id="chN">` HTML version, inserted before the `<!-- GENERAL -->` block.
- `dead-men-on-thrones/DMOT_Index.txt` — `CHAPTER [N] — [TITLE]` block of key-term
  entries in order of first appearance in the chapter, inserted before
  `MAINTENANCE`.
- `dead-men-on-thrones/book-index.html` — the matching `<div class="chapter-block"
  id="chN">` HTML version, inserted before the closing `</div>` of `.index-wrap`.

This is not optional or separately requested — it's part of what publishing a
chapter means, every time.

## 10. Update progress status

Edit the `PROGRESS STATUS` section in `dead-men-on-thrones/CLAUDE.md`: bump the
chapter count, add the new chapter to the appropriate Part's list, update which
chapters/files are live, and update the "Next up" line to whatever chapter
logically follows (checking the outline for whether the next Part begins).

## 11. Publish

```
git fetch origin main
git log --oneline -3 origin/main   # compare against local; merge cleanly if it's ahead
```

Then stage exactly the files this chapter touched (the new chapter file, its audio
script in `audio/`, the two site pages, the four appendix files, and `CLAUDE.md`)
and commit — do not use `git add -A`, since other sessions may be working this same
repo concurrently and could have unrelated in-progress changes on disk. This repo's root `CLAUDE.md` says to
push straight to `main`: no PR, no feature branch, per Sandy's standing instruction.
Never force-push; if `origin/main` has moved since your last fetch, merge cleanly
first (watch for unrelated concurrent changes to the same files — e.g. site-wide
nav-order edits — merging in without conflicting with your own additions).

Confirm the push actually landed:

```
git rev-parse HEAD
git ls-remote origin refs/heads/main
```

Both hashes should match before telling the user it's done.

## 12. Report

Summarize for the user: chapter title and number, word count (as information, not
a verdict), the key beats covered, what got deliberately deferred or called back to
another chapter instead of repeated, whether the audio script needed any long
sentences split (or flagged any it couldn't), and what the outline says comes next.

---

## Book-specific assumptions (relevant if this skill is ever generalized)

- Exactly four appendix files, in the specific paired txt/html format above.
- The Marcion-thread rule (a callback expected in every Part).
- `dead-men-on-thrones/` as a fixed path prefix throughout.
- The specific chapter-file naming (`chNN.md`, zero-padded two digits) and the
  `chapters` map / TOC-row wiring shape in `chapter.html` / `index.html`.
- The vendored `marked.js` copy in `references/` is pinned at v9.1.6 — bump it
  deliberately if the production site's CDN-loaded version ever changes, so the
  render check keeps testing against something reasonably close to production.
- The audio-script step (6) starts at Chapter 25 and doesn't reach back for 1–24;
  a separate cleanup skill is expected to handle both the em-dash removal and any
  audio-script backfill for those chapters, later.
- `chapter_to_script.py` duplicates (rather than imports) the number-formatting
  helpers from `wetwear-brief/scripts/html_to_script.py`, per this project's
  convention of each skill's scripts being self-contained. If the shared logic
  ever needs a real fix, it currently has to be made in both places.
