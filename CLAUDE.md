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

## AI News (`/ai-news/`)

Not a book — a standalone, lightweight newspaper-styled dispatch section,
separate from the shelf. Replaced an earlier per-book newsletter (retired,
along with its Substack link) that used to live inside `original-bug-book`.

`index.html` is the hub page. It lists **one single unified "Issues"
archive** — no separate "Series" category. Sandy explicitly rejected
splitting sub-series into their own segregated section (2026-08-23): every
entry, whatever its source, lives in the same list and is sorted by
recency, newest first.

Rules for the Issues list:
- **One list, not split by type.** The hand-written pieces
  (`issue-01.html`, `issue-02.html` — tied to The Original Bug) and any
  sub-series (e.g. Wetwear, linked as a single row pointing at its own
  index — see below) all sit in the same `archive-wrap` block.
- **Sorted newest-first, always.** New entries — whether a new hand-written
  issue or a newly-active sub-series — get added **at the top**. Never
  append to the bottom, and never pull an entry out into a separate section.
- **No issue numbers anywhere** — Sandy asked for these removed; don't
  reintroduce "Issue 01," "Vol. I," or similar labels.
- Nav links on every AI News page: Read the Book (→ `original-bug-book`),
  AI Tools (→ `ai-tools-directory`), All Issues (self, on issue pages) /
  AI Tools (on the hub), &larr; Bookshelf. `bookshelf.html`,
  `ai-tools-directory`, and `ai-news/` are meant to have visually matching
  top navs — keep nav changes in sync across all three.
- The AI-disclosure/accuracy note lives once, at the bottom of `index.html`
  only — not repeated on every issue page.

**Wetwear Daily News Brief (`/ai-news/wetwear/`)** — a long-form daily news
digest (biology, misinformation, health/science policy, public health
data), written in full narrative paragraphs, one per notable story, plus a
"Biggest Story," "Good News," and "Sources" section each day. Originally
named "Wetworks" — renamed to "Wetwear" by Sandy's request 2026-08-23; both
the folder and every in-page reference were updated.

**Every day's brief gets its own permanent row on the `ai-news/index.html`
hub — it is never overwritten or removed.** An earlier version of this
rule said to update a single Wetwear row in place each day; Sandy
corrected this on 2026-08-23 (the 8/22 brief had disappeared from the hub
list when 8/23 replaced it, which she did not want) — do not reintroduce
the single-row behavior.
- Each day, **add a new row to the top** of the same unified Issues list
  as everything else, no separate section, exactly like a new hand-written
  Issue would be added. Older Wetwear rows stay exactly where they are,
  further down the newest-first list, permanently.
- That row **links straight to that day's specific brief**
  (`wetwear/YYYY-MM-DD.html`), never to `wetwear/index.html`. Sandy
  explicitly does not want an intermediate archive page in the click path
  — one click, straight to the article, like every other entry in the list.
- Its `.issue-title` is that day's real, specific headline (see below) —
  not "Wetwear Daily News Brief — [date]." Its `.issue-excerpt` starts
  with the date (`[Month Day, Year] — `) followed by that day's real
  teaser. This matches how every other row in the list already works —
  nothing marks a row as "from Wetwear" versus hand-written; the unified
  list doesn't distinguish sub-sources, by design.
- `wetwear/index.html` is a secondary, full archive of every daily brief,
  newest first, reachable from inside any brief page via "All Briefs." It
  exists in parallel to the hub rows, not instead of them.
- `wetwear/YYYY-MM-DD.html` — one page per day, matching `ai-news/issue-*.html`'s
  layout (masthead-strip, headline/deck/byline, `.section-label` dividers
  instead of a single continuous article, sources as a linked list at the bottom).
  **The `<h1 class="headline">` must be a real, specific news headline
  written from that day's biggest story** (e.g. "The Largest Ebola Outbreak
  in Congo's History Is Still Accelerating") — never the generic "Daily
  Brief — [date]" pattern used before 2026-08-23. The `.deck` teases the
  rest of the day's stories in one sentence. The date moves into the
  byline instead (`Sandy B. Patterson · [Month Day, Year]`), since it's no
  longer in the headline. `wetwear/index.html`'s archive row for that day
  uses the same real headline as its `.issue-title`, not the generic
  pattern either — keep both places in sync.
- Nav on every Wetwear page uses `nav-brand` = "AI News" linking to
  `/ai-news/` (not to the Wetwear subfolder) — wayfinding always points up
  to the hub, matching how `issue-*.html` pages already do this.
- `wetwear/YYYY-MM-DD.txt` — a plain-text companion to every HTML brief,
  same filename, `.txt` instead of `.html`, at the predictable URL
  `https://sandybpatterson.github.io/ai-news/wetwear/YYYY-MM-DD.txt`. Built
  2026-08-23 for a downstream consumer (`soda-bot`/SODA — investigated at
  the time; it has no ready-built way to ingest this yet, but the file
  exists so the URL convention is settled whenever that's built).
  Reformatted 2026-08-24 to read as a spoken script for narration, not a
  written article — per Sandy's example. Content, in order:
  - Fixed tagline line: `Coming up on Wetwear: Biology Corrected.` (said
    the same way every day, not a daily-changing tease), then a blank line.
  - The real headline, then the deck, each on their own line.
  - A spoken byline sentence: `I am Sandy B. Patterson, and today is
    [Month Day, Year].`
  - A blank line, then a row of `=` matching the headline's length.
  - Each section (Biggest Story, Biology, Misinformation, Public Health
    Data, Politics, Good News) as a spoken transition line — e.g. "Here is
    the BIGGEST STORY from [source name]," "Here is the latest in
    BIOLOGY" — naming a real source where that reads naturally, followed
    by a row of `-` matching the length of the UPPERCASE label itself
    (not the full sentence), then the section's paragraph(s) in reading
    order, each separated by a blank line.
  - **No Sources section** — the spoken script ends after Good News; drop
    the sources list entirely (it's on the HTML page for anyone who wants
    it, just not read aloud). Generate this alongside the HTML every
    day — never skip it.

The CCR Routine ("Daily Long-Form News Digest," fires 10pm Central / 3:00
UTC — set so it runs after most of the day's news has settled) generates
each day's Wetwear brief via web search, writes `ai-news/wetwear/YYYY-MM-DD.html`,
adds a row to `ai-news/wetwear/index.html`, updates the date on the
`ai-news/index.html` hub row, and pushes directly to `main` — no merge
step needed. (Its prompt briefly drifted to a nonexistent `news-digest/`
path on 2026-08-22; corrected back to `ai-news/wetwear/` on 2026-08-23.
Schedule moved from 14:00 UTC to 10pm Central on 2026-08-23 — since that's
a fixed UTC cron time, it'll drift an hour when US clocks change off DST;
revisit then.) If a day's brief doesn't appear or the hub date goes stale,
check whether that Routine actually ran.

A second Routine ("Daily Watch: Biology, Misinformation & Public Health")
was disabled 2026-08-23 — it covered the same four topic areas as a short
bullet-point digest, but its prompt never specified a file path or repo to
publish to, so it didn't appear to write anything to this site. Redundant
with the Routine above — Sandy confirmed it should be disabled.

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
