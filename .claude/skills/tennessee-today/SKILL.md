---
name: tennessee-today
description: Researches, writes, and publishes "Tennessee Today" — a Tennessee-focused news digest (state politics and political quotes, bills, infrastructure, pollution and green energy, misinformation, human rights, ranked choice voting, corruption, politicians lying, plus good news) that lives at ai-news/tennessee-today/ on the sandybpatterson.github.io site. Use this skill whenever asked to run, generate, write, or publish "Tennessee Today," "the Tennessee article," or "today's Tennessee piece," or to catch up a missing day — even if the request is as short as "run Tennessee Today" or "do the Tennessee one for the 28th." Also use it if asked to backfill a specific missed date. Accepts an optional date; defaults to today.
---

# Tennessee Today

This skill produces Tennessee Today on demand, from a session that actually has push access to this repo. Every run is a full, real publish: finished HTML committed and pushed to `main`, with permanent rows added to two index pages. There's no draft mode and no dry run, so move carefully through the steps below rather than rushing to the finish.

Unlike the Wetwear Daily News Brief, Tennessee Today has no podcast `.txt` companion. The HTML page is the whole product. Do not generate a `.txt` for it.

Before doing anything else, skim the "Sandy's Blog" section of `/CLAUDE.md` at the repo root if you haven't already this session — it documents the invariants this skill depends on (the unified newest-first Issues list, why every day's article is a *permanent* row that never gets edited or removed, why there's no "Series" section). Those rules exist because Sandy corrected them explicitly in the past; this skill enforces them, but understanding why helps you handle anything unusual that comes up.

## 0. Figure out the date, and check you're not about to clobber something

If the user passed a specific date (e.g. "run Tennessee Today for 2026-11-24," "do tomorrow's," "do the 29th"), use that — it always wins over any default below.

Otherwise, default to today in US Central.

Check whether `ai-news/tennessee-today/YYYY-MM-DD.html` already exists for that date. Every day's article is a *permanent* entry on this site — nothing about this workflow expects to overwrite one. If a file for that date already exists, stop and ask the user whether they really want it regenerated (and if so, whether the existing index rows should be updated in place rather than duplicated) before doing any research. Don't guess on this one; overwriting the wrong day's article is hard to notice after the fact.

## 1. Research Tennessee sources

Use WebSearch for Tennessee news from roughly the last 24–48 hours. Check the standing source list first, then search broadly enough that you're actually choosing the most significant stories rather than writing up whatever you found first:

**State government and data**
- tn.gov — state agencies and announcements
- Tennessee Department of Health — disease stats, health data
- TN General Assembly (capitol.tn.gov) — bills and laws
- TWRA — wildlife and fisheries
- TDEC — environment, state parks
- Tennessee Comptroller — audits and spending

**News**
- The Tennessean (Nashville)
- Knoxville News Sentinel
- Chattanooga Times Free Press
- Commercial Appeal (Memphis)
- Nashville Scene
- Tennessee Lookout — nonprofit state politics coverage
- Tennessee Holler
- WPLN — Nashville public radio
- Daily News Journal (Murfreesboro)
- Murfreesboro Post
- Rutherford Source
- WGNS — Murfreesboro radio

**Science and universities**
- UT Knoxville
- Vanderbilt and Vanderbilt University Medical Center
- UT Health Science Center (Memphis)
- St. Jude Children's Research Hospital
- Oak Ridge National Laboratory
- MTSU (Murfreesboro)
- UT Institute of Agriculture

**Nature and history**
- Great Smoky Mountains National Park (NPS)
- TVA
- Tennessee State Parks
- Tennessee State Library and Archives
- Tennessee Encyclopedia
- Stones River National Battlefield

Where a story is still developing, prefer the most recent numbers over ones already used in a prior article — check the last article or two in `ai-news/tennessee-today/` if you're unsure whether a stat has already run, since restating the exact same figures two days running reads as stale rather than as an update.

## 2. Pick the Big Story and write the sections: carrot and stick

Tennessee Today runs on a carrot-and-stick structure. The hard news comes first; the piece closes with something palatable. Write in full narrative prose throughout — this is a long-form digest, not a bullet-point roundup:

- **The Big Story**: the single most significant Tennessee story of the day, good or bad. One to six paragraphs, the longest piece in the article, covering the key facts, numbers, context, and why it matters. It can come from any topic area; use judgment about real-world impact and newsworthiness rather than defaulting to whichever area feels most "big story shaped."
- **The Sticks**: the hard news, one to two paragraphs per story. Topic areas: current events, politics and political quotes, bills, infrastructure issues, pollution and green energy, misinformation, human rights, ranked choice voting, corruption, politicians lying. Two standing features belong here when the day's news supports them:
  - **They Said It**: one quote from a Tennessee politician, checked against the record. Quote them exactly, then say plainly whether the record backs it up.
  - **Bill Watch**: one bill in the General Assembly — what it does, who it affects, and where it stands.
  Skip a topic entirely if nothing notable turned up. Don't pad it out to hit a quota.
- **The Carrots**: good news stories, one to two paragraphs each, closing the piece on something palatable. Genuinely positive Tennessee stories: a recovery, a win, a rescue, a milestone, a neighbor doing something remarkable. Tennessee history can appear here when there's a good one, but it is not a daily fixture — Sandy does not want an "on this day" item every day. If nothing legitimately positive turned up, say so in a single honest sentence rather than stretching a neutral story into good news.
- **Sources**: every URL you actually cited, as a linked list (built in step 3).

Write a real, specific headline drawn from the Big Story — never a generic "Tennessee Today — [date]" pattern. Sandy has explicitly rejected that pattern before (see the Wetwear brief's history in `/CLAUDE.md`). Keep the headline short: one clause, roughly 60 characters or fewer. Sandy called the first article's two-clause headline too long on 2026-11-23. Write a one-sentence deck teasing the rest of the day's stories.

**Two hard style rules, non-negotiable, the same as every Sandy's Blog piece: apply these while writing, not as a later fixup:**
- **No em dashes, anywhere:** not in the headline, the deck, or any paragraph. Rework with a comma, a colon, a semicolon, or a new sentence instead. Sandy banned them outright; find and replace every one as you write, don't leave any for later.
- **No sentence over 400 characters**, in the headline, the deck, or any paragraph. Split it into two or three shorter sentences as you write it.

## 3. Build the HTML page

Copy `references/tennessee-template.html` in this skill folder and fill in every `{{PLACEHOLDER}}` with real content — headline, deck, byline date, each section's paragraphs, and the sources list. Keep the surrounding markup and the entire `<style>` block untouched; the whole point of a shared template is that every article looks identical, and inventing new styling per day would break that.

A few things worth getting right:
- Only include `<p class="section-label">` for sections you actually wrote content for — delete the placeholder line for any section you skipped.
- The byline date format is `Sandy B. Patterson &middot; August 28, 2026` (full month name, no leading zero on the day).
- Sources go in citation order, not alphabetical, as `<li><a href="URL">Publication — Headline or description</a></li>`.

Save the finished file as `ai-news/tennessee-today/YYYY-MM-DD.html`.

The template carries the shared audio reader: a `<meta name="book-title" content="Tennessee Today">` tag in `<head>` and `<script src="../../reader.js"></script>` just before `</body>`. Both come with the template; do not drop them when filling it in. (Sandy caught their absence from the 2026-11-23 article on 2026-11-23 — the template had never included them.)

**Header image (Muse only).** When Muse is the one running this skill, generate a header image for the top of the article: an editorial image tied to the Big Story, in the site's dark-and-gold style, at a 16:9 ratio (1600x900) — not a wide panoramic banner; Sandy found 3:1 too wide on 2026-11-23. Save it as `ai-news/tennessee-today/images/YYYY-MM-DD-header.jpg` at 1600px wide, and insert `<img class="header-img" src="images/YYYY-MM-DD-header.jpg" alt="...">` between the headline and the deck (the template already carries the `.header-img` CSS rule). If words appear in the image at all, they must be part of the object or scene itself — forged, carved, or printed into it — never a label laid over the picture; Sandy rejected that pasted-on look on 2026-11-23. When Claude or anyone else runs this skill, skip the image entirely and publish the page without one. Do not leave a broken image tag behind.

## 4. Add the permanent index rows

Add a new row to the **top** of the archive list in `ai-news/tennessee-today/index.html`:

```html
<a href="https://sandybpatterson.github.io/ai-news/tennessee-today/YYYY-MM-DD.html" class="issue-row">
  <div class="issue-title">{{HEADLINE}}</div>
  <div class="issue-excerpt">{{Month Day, Year}} &mdash; {{one-sentence teaser}}</div>
</a>
```

Then add the identical row to the **top** of the unified "Issues" list in `ai-news/index.html` — same headline, same excerpt pattern, same href.

Never edit, move, or remove any earlier day's row in either file. This has bitten a previous version of this workflow before: an earlier design that overwrote a single row in place caused an already-published day's brief to silently vanish from the site, which Sandy explicitly corrected. Every day is its own permanent entry, newest first, in the same unified list as everything else — no separate "Series" section, ever.

## 5. Publish

Before committing, sync with the remote — other sessions sometimes work this same repo concurrently, so don't assume your local `main` is current:

```
git fetch origin main
git log --oneline -3 origin/main   # compare against local; merge/pull if it's ahead
```

Then commit and push:

```
git add "ai-news/tennessee-today/YYYY-MM-DD.html" ai-news/index.html ai-news/tennessee-today/index.html
# when Muse generated a header image, add it too:
git add "ai-news/tennessee-today/images/YYYY-MM-DD-header.jpg"
git commit -m "Add Tennessee Today for YYYY-MM-DD"
git push origin main
```

This repo's `CLAUDE.md` says to push straight to `main` — no PR, no feature branch, by Sandy's explicit standing instruction. Never force-push; if `origin/main` has moved since your last fetch, merge cleanly first.

Confirm the push actually landed (`git log --oneline -1 origin/main` after fetching again) before telling the user it's done — a silent push failure here is exactly the failure mode this skill exists to route around.

## When you're done

Summarize the article for the user the way you would any finished piece of writing: the headline, what the Big Story was, and a quick list of what else got covered. They may want to sanity-check a stat or ask for a different lead story before it's considered final — a push is easy to follow up with another commit, so don't treat this as unfixable once it's live.
