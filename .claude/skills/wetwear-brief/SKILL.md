---
name: wetwear-brief
description: Researches, writes, and publishes that day's "Wetwear Daily News Brief" — a long-form daily news digest (biology, misinformation, public health data, politics) that lives at ai-news/wetwear/ on the sandybpatterson.github.io site. Use this skill whenever asked to run, generate, write, or publish "today's brief," "the Wetwear brief," "the daily brief," or "the daily news digest," or to catch up a missing day — even if the request is as short as "run today's brief" or "do the Wetwear brief for the 28th." Also use it if asked to backfill a specific missed date. Accepts an optional date; defaults to today.
---

# Wetwear Daily News Brief

This skill replaced a scheduled automation (a CCR Routine) that used to generate this
brief every night. That automation's environment couldn't push to this repo, so briefs
now get produced on demand, from a session — like this one — that actually has push
access. Every run is a full, real publish: finished HTML and text files, committed and
pushed to `main`, with permanent rows added to two index pages. There's no draft mode
and no dry run, so move carefully through the steps below rather than rushing to the
finish.

Before doing anything else, skim the "AI News" section of `/CLAUDE.md` at the repo
root if you haven't already this session — it documents the invariants this skill
depends on (the unified newest-first Issues list, why every day's brief is a
*permanent* row that never gets edited or removed, why there's no "Series" section,
and why the `.txt` companion has no Sources section). Those rules exist because Sandy
corrected them explicitly in the past; this skill enforces them, but understanding why
helps you handle anything unusual that comes up.

## 0. Figure out the date, and check you're not about to clobber something

If the user passed a specific date (e.g. "run the brief for 2026-08-24," "do
tomorrow's," "do the 29th"), use that — it always wins over any default below.

Otherwise, work out the date the same way a newspaper dates an evening edition: the
standing routine is to run this skill around 10–11pm US Central the night before,
producing the brief for the *next* day. So default by the current time in US Central:
- **Before 7pm Central** → today's date.
- **At or after 7pm Central** → tomorrow's date.

This means a run at 10:30pm Central on August 27 defaults to `2026-08-28`, not
`2026-08-27` — matching the date on the checker routine that verifies each morning
that the file for "today" already exists by 9am.

Check whether `ai-news/wetwear/YYYY-MM-DD.html` already exists for that date. Every
day's brief is a *permanent* entry on this site — nothing about this workflow expects
to overwrite one. If a file for that date already exists, stop and ask the user
whether they really want it regenerated (and if so, whether the existing index rows
should be updated in place rather than duplicated) before doing any research. Don't
guess on this one; overwriting the wrong day's brief is hard to notice after the fact.

## 1. Research across four areas

Use WebSearch for news from roughly the last 24–48 hours in each of:

1. **Biology / life sciences** — notable research findings, discoveries, major biology news.
2. **Misinformation** — health or science misinformation: viral false claims, debunking/fact-checks, platform or official responses.
3. **Public health data & statistics** — new CDC/WHO/government data releases, disease surveillance updates, outbreak reports, major public health statistics.
4. **Politics** — public health, science policy, or biology-related political/legislative/regulatory news.

Search broadly enough in each area that you're actually choosing the most significant
story rather than writing up whatever you found first. A few searches per area is
normal. Where a story is still developing, prefer the most recent numbers over ones
already used in a prior brief — go check the last day or two of briefs in
`ai-news/wetwear/` if you're unsure whether a stat has already run, since restating
the exact same figures two days running reads as stale rather than as an update.

## 2. Pick the Biggest Story and write the sections

Decide which single story is most significant overall — it can come from any of the
four areas, not just Public Health Data. A large or fast-escalating outbreak, a major
policy reversal, or a landmark study can all be the lead; use judgment about real-world
impact and newsworthiness rather than defaulting to whichever area feels most
"biggest story shaped."

Write in full narrative prose throughout — this is a long-form digest, not a
bullet-point roundup:

- **Biggest Story**: one full paragraph, roughly 6–10 sentences, covering the key
  facts, numbers, context, and why it matters.
- **Biology / Misinformation / Public Health Data / Politics**: each notable story
  gets its own paragraph under that area's label. Skip an area entirely if nothing
  notable turned up — don't pad it out to hit a quota.
- **Good News**: one paragraph on a genuinely positive story, if one exists. If
  nothing legitimately positive turned up, say so in a single honest sentence rather
  than stretching a neutral story into "good news."
- **Sources**: every URL you actually cited, as a linked list (built in step 4).

Write a real, specific headline drawn from the Biggest Story — never a generic
"Daily Brief — [date]" pattern. Sandy has explicitly rejected that pattern before.
Write a one-sentence deck teasing the rest of the day's stories.

## 3. Build the HTML page

Copy `references/brief-template.html` in this skill folder and fill in every
`{{PLACEHOLDER}}` with real content — headline, deck, byline date, each section's
paragraphs, and the sources list. Keep the surrounding markup and the entire `<style>`
block untouched; the whole point of a shared template is that every brief looks
identical, and inventing new styling per day would break that.

A few things worth getting right:
- Only include `<p class="section-label">` for sections you actually wrote content
  for — delete the placeholder line for any area you skipped.
- The byline date format is `Sandy B. Patterson &middot; August 28, 2026` (full
  month name, no leading zero on the day).
- Sources go in citation order, not alphabetical, as `<li><a href="URL">Publication —
  Headline or description</a></li>`.

Save the finished file as `ai-news/wetwear/YYYY-MM-DD.html`.

## 4. Generate the `.txt` companion

Don't hand-write this — run the bundled converter, which turns your finished HTML
into the spoken-script format automatically:

```
python3 .claude/skills/wetwear-brief/scripts/html_to_script.py \
  ai-news/wetwear/YYYY-MM-DD.html \
  ai-news/wetwear/YYYY-MM-DD.txt \
  "a real named source for the Biggest Story, e.g. the CDC"
```

The third argument fills in "Here is the BIGGEST STORY from ___" — pick whichever
organization or outlet you actually leaned on most for that section (CDC, WHO, a named
university, etc.), not a generic phrase like "the news."

The script handles the fiddly parts that are easy to get subtly wrong by hand: the
fixed tagline, the spoken byline sentence, the `=` divider sized to the headline's
exact character length, and a `-` underline under each section header sized to the
label itself (e.g. `BIOLOGY`, five dashes) rather than the whole sentence around it.
It also drops the Sources section entirely, on purpose — the `.txt` file is a
narration script, and Sandy asked for the spoken version to end after Good News with
no source list read aloud.

Skim the output before moving on. If a section's paragraphs read oddly split or a
label didn't map to a sensible "Here is the latest in ___" line, it's worth fixing the
HTML source and re-running the script rather than patching the `.txt` by hand — that
keeps the two files honestly in sync.

## 5. Add the permanent index rows

Add a new row to the **top** of the archive list in `ai-news/wetwear/index.html`:

```html
<a href="https://sandybpatterson.github.io/ai-news/wetwear/YYYY-MM-DD.html" class="issue-row">
  <div class="issue-title">{{HEADLINE}}</div>
  <div class="issue-excerpt">{{Month Day, Year}} &mdash; {{one-sentence teaser}}</div>
</a>
```

Then add the identical row to the **top** of the unified "Issues" list in
`ai-news/index.html` — same headline, same excerpt pattern, same href (the `.html`
file, not the `.txt`).

Never edit, move, or remove any earlier day's row in either file. This has bitten a
previous version of this workflow before: an earlier design that overwrote a single
Wetwear row in place caused an already-published day's brief to silently vanish from
the site, which Sandy explicitly corrected. Every day is its own permanent entry,
newest first, in the same unified list as everything else — no separate "Series"
section, ever.

## 6. Publish

Before committing, sync with the remote — other sessions sometimes work this same
repo concurrently, so don't assume your local `main` is current:

```
git fetch origin main
git log --oneline -3 origin/main   # compare against local; merge/pull if it's ahead
```

Then commit and push:

```
git add ai-news/wetwear/YYYY-MM-DD.html ai-news/wetwear/YYYY-MM-DD.txt ai-news/index.html ai-news/wetwear/index.html
git commit -m "Add Wetwear brief for YYYY-MM-DD"
git push origin main
```

This repo's `CLAUDE.md` says to push straight to `main` — no PR, no feature branch,
by Sandy's explicit standing instruction. Never force-push; if `origin/main` has moved
since your last fetch, merge cleanly first.

Confirm the push actually landed (`git log --oneline -1 origin/main` after fetching
again) before telling the user it's done — a silent push failure here is exactly the
failure mode this skill exists to route around.

## When you're done

Summarize the brief for the user the way you would any finished piece of writing:
the headline, what the Biggest Story was, and a quick list of what else got covered.
They may want to sanity-check a stat or ask for a different lead story before it's
considered final — a push is easy to follow up with another commit, so don't treat
this as unfixable once it's live.
