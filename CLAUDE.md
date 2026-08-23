# sandybpatterson.github.io — Site Handoff
### For Claude: Read this first before doing anything else.

---

## Git Workflow

**Push directly to `main`.** This is a one-person site with no review
process — Sandy previews changes by looking at the live GitHub Pages site,
so a change sitting on an unmerged feature branch is invisible to them. Don't
open a PR or leave work on a branch unless they explicitly ask for one.

---

## What This Repo Is

Sandy B. Patterson's author website. `bookshelf.html` is the home page (a
GitHub Pages redirect from `index.html`) and links out to every book. Some
books live in their own repos; some live as folders inside this repo.

**Books on the shelf, in shelf order:**
1. **The Original Bug** — separate repo `original-bug-book` (has its own CLAUDE.md)
2. **Beyond Ice and Steam** — separate repo `beyond-ice-and-steam` (has its own CLAUDE.md)
3. **Dead Men on Thrones** — lives here, in `/dead-men-on-thrones/` (full 64-chapter outline, no chapters drafted yet — see below)
4. **Stories from Winchester** — lives here, in `/stories/`
5. **Arden Remembers** — lives here, in `/arden-remembers/` (empty template — see below)

---

## Design System (applies to every page on the shelf, including the two separate book repos)

- **Background:** `#0a0a0a`, text `#e8e8e8`
- **Accent:** gold `#c9a84c` (Beyond Ice and Steam still uses its own `#B8A98A` + teal `#2C5F6E` — a deliberate book-specific variant per its own CLAUDE.md, not an inconsistency to "fix" without asking)
- **Fonts:** Georgia/Times New Roman serif for body and headings, `'Courier New'` monospace for nav/labels/eyebrows
- **Layout:** sticky top `<nav>` with `.nav-brand` (left) + `.nav-links` pill-style links (right), 680px max-width content column
- **Every chapter/story reading page should link back to the bookshelf** via a `.nav-links` entry: `<a href="https://sandybpatterson.github.io/bookshelf.html">&larr; Bookshelf</a>`

Match this system for any new page added to the shelf, whether it lives in this repo or a separate one.

---

## reader.js

`reader.js` at repo root is the single shared Web Speech API chapter reader
(voice picker, iOS Media Session lock-screen integration, progress bar,
screen wake lock, Chrome long-utterance keepalive) for every book on the
shelf. Edit it here — nowhere else.

Note: this root copy isn't loaded by anything in `/stories/` (those pages
use their own self-contained audio player, not `reader.js`).

Every other book's `chapter.html` loads it from the hosted copy —
`https://sandybpatterson.github.io/reader.js` — and has a
`<meta name="book-title" content="...">` tag in `<head>` that `reader.js`
reads for Media Session branding:
- `dead-men-on-thrones/chapter.html` and `arden-remembers/chapter.html`
  (same repo, loaded via the relative `../reader.js` since they're local)
- `original-bug-book/chapter.html` and `beyond-ice-and-steam/chapter.html`
  (separate repos, loaded via the hosted URL above — their own local
  `reader.js` copies were deleted once this migration completed)

There is now exactly one copy of this file. A fix made here is live for
every book the moment it's pushed — no per-repo sync needed, ever.

---

## AI News (`/ai-news/`)

Not a book — a standalone, lightweight newspaper-styled dispatch section,
separate from the shelf. Replaced an earlier per-book newsletter (retired,
along with its Substack link) that used to live inside `original-bug-book`.

Structure:
- `index.html` — masthead + archive list of every issue (title + short
  excerpt only). **No issue numbers anywhere** — Sandy asked for these
  removed; don't reintroduce "Issue 01," "Vol. I," or similar labels.
- `issue-NN.html` — one file per issue, single-column newspaper-style
  article (small masthead strip, headline, deck, byline, drop-cap opening
  paragraph, optional pull-quote/section-break).

**When adding a new issue:**
1. Copy the most recent `issue-NN.html` as a starting template.
2. Add its entry to `index.html`'s archive list **at the top** — the list
   is sorted newest-first, always. Never append a new issue to the bottom.
3. Nav links on every AI News page: Read the Book (→ `original-bug-book`),
   AI Tools (→ `ai-tools-directory`), All Issues (self), &larr; Bookshelf.
   These three pages' top navs are meant to visually match — keep any nav
   changes in sync across `ai-news/`, `ai-tools-directory`, and
   `bookshelf.html`.

The AI-disclosure/accuracy note lives once, at the bottom of `index.html`
only — not repeated on every issue page.

---

## Stories from Winchester (`/stories/`)

Status: 2 stories complete —
- `biscuits-warmth.html` — "Biscuit's Warmth" (January 1923)
- `the-incident-at-first-national.html` — "The Incident at First National" (October 1923)

`stories-template.html` is the starting point for new stories — copy it,
fill in the header/title/date and story body, keep the drop-cap/section-break/
pull-quote classes as documented in its comments.

---

## Arden Remembers (`/arden-remembers/`)

**Status: brand new, empty template. No premise, no chapters written yet.**

Format: fiction novel, built on the same chapter-reader pattern as The
Original Bug and Beyond Ice and Steam (`index.html` table-of-contents page +
`chapter.html` markdown-chapter reader), not the standalone-HTML-per-story
pattern used by Stories from Winchester.

Structure in place:
- `index.html` — hero header + table of contents with 3 placeholder rows (Chapter One/Two/Three, status "Coming Soon") so visitors can see where chapters will land
- `chapter.html` — reader shell with an empty `chapters` map, ready for entries like:
  ```js
  1: { file: 'chapters/ch01.md', title: 'Chapter Title' },
  ```
- `chapters/` — empty folder, chapters go here as `chNN.md`

**What to do next:**
1. Get the premise/blurb from Sandy and replace the "Premise coming soon." placeholder in `index.html`
2. Write chapters as markdown files in `chapters/`, add each to the `chapters` map in `chapter.html`
3. Replace the 3 placeholder TOC rows in `index.html` with real chapter rows as each goes live (swap `chapter-status` text to "Read" and add the `ready` class, matching TOB's pattern)
4. No cover art yet — shelf entry uses the text/gold-ornament placeholder cover, same as Beyond Ice and Steam

---

## Dead Men on Thrones (`/dead-men-on-thrones/`)

**Status: full outline complete, zero chapters drafted.** This is a large
nonfiction project — a popular history of Christianity and institutional
power, organized around Marcion of Sinope (excommunicated 144 AD) as the
throughline. 64 chapters across 8 parts, plus a preface, introduction,
conclusion, and 5 appendices. Full outline, voice/tone guidance, and chapter-
by-chapter content notes live in `dead-men-on-thrones/CLAUDE.md` — read that
file before drafting any chapter, it has the complete brief.

Structure in place, same pattern as The Original Bug / Beyond Ice and Steam:
- `index.html` — hero + premise + full table of contents with all 64 chapters
  (plus preface/introduction/conclusion) listed as placeholder rows, status
  "Coming Soon," organized under their Part headings
- `chapter.html` — reader shell with an empty `chapters` map. Special string
  keys `'0'` (Preface), `'i'` (Introduction), `'c'` (Conclusion) are reserved
  alongside numeric keys `1`–`64`
- `chapters/` — empty folder, chapters go here as `chNN.md`

**What to do next:**
1. Sandy picks a chapter to draft first (not necessarily chapter 1 — see CLAUDE.md, chapters don't have to be written in order)
2. Write it as markdown in `chapters/`, add it to the `chapters` map in `chapter.html`
3. Swap that chapter's row in `index.html` from "Coming Soon" to "Read" (add the `ready` class) and update the "X of 64 chapters written" count in `.toc-label`
4. Cover art done — `images/dmotcover.jpeg`, already wired into `bookshelf.html`

---

## Cover Art

Book cover images live in this repo's `/images/` folder (not in the book's
own repo) — e.g. `images/tobcover.png` for The Original Bug. A book without
a cover file just uses the text/gold-ornament placeholder cover in
`bookshelf.html` (`.sbp-cover-title` + `.sbp-cover-ornament`) instead of an
`<img>`. Beyond Ice and Steam and Arden Remembers are currently in this
placeholder state — no cover files exist for either yet. Dead Men on Thrones
has a real cover: `images/dmotcover.jpeg`.

---

*Last updated: August 2026*
