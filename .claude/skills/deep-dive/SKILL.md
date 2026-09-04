---
name: deep-dive
description: Researches, writes, and publishes a "Wetwear Deep Dive" — a long-form, single-topic investigative piece (biology, misinformation, public health policy, or science politics) that lives at ai-news/wetwear/ on the sandybpatterson.github.io site, alongside the daily briefs. Use this skill whenever asked to run, write, or publish a "deep dive," a "Wetwear Deep Dive," or an investigative long-read on a specific topic — e.g. "do a deep dive on the peptide compounding fight" or "/deep-dive [topic]". Unlike the daily brief, this covers one story in full, with freeform section labels tailored to that story, not a fixed daily taxonomy.
---

# Wetwear Deep Dive

## What this is

A Deep Dive is the investigative sibling of the Wetwear Daily News Brief — same
publication (`Wetwear: Biology Corrected`), same site section (`ai-news/wetwear/`),
same visual system, but a completely different shape. A Daily Brief covers several
stories in one issue, each slotted into a fixed set of labeled sections (Biggest
Story, Biology, Misinformation, Public Health Data, Politics, Good News). A Deep
Dive covers **one** story, in full, at length — and its section labels are
**freeform**, written specifically for that story (e.g. "What Changed," "What FDA's
Own Scientists Said," "What The Vote Actually Means — And Doesn't," "What Happens
Next" — real labels from a real Deep Dive, not a template to imitate verbatim).
There's no fixed count or fixed taxonomy; write as many sections as the actual
investigation needs, each with its own specific label. The only fixed section is
**Sources**, always last.

Before doing anything else, skim the "Sandy's Blog" section of `/CLAUDE.md` at the
repo root if you haven't already this session — it documents the invariants both
this skill and `wetwear-brief` depend on (the unified newest-first Issues list, why
every entry is a *permanent* row that never gets edited or removed, and the current
`.txt` naming convention, which this skill uses too).

## 0. Figure out the topic and filename, and check you're not clobbering something

Deep Dives aren't dated the way Daily Briefs are — the HTML filename is a slug drawn
from the topic, not a date: `ai-news/wetwear/deep-dive-{topic-slug}.html` (e.g.
`deep-dive-peptide-compounding-fight.html`). Pick a short, specific slug once you
know the real headline.

Check that no existing file already covers this exact story before starting
research — skim `ai-news/wetwear/index.html`'s archive for prior Deep Dive entries.
This is a permanent entry like everything else on this site; if something close
already exists, ask the user whether this is genuinely a new angle or a duplicate
before doing any research.

## 1. Research the topic thoroughly

Unlike the Daily Brief's four-beat scan, a Deep Dive goes deep on one subject. Use
WebSearch broadly enough to actually understand the full shape of the story: what
happened and when, in order; who the real actors are and what they actually said or
did (not paraphrased secondhand); what the evidence itself shows, not just what
people claim it shows; and what serious, informed disagreement (if any) exists —
distinguished from noise (influencer hype on one side, reflexive alarmism on the
other). A real Deep Dive reads like it was reported, not summarized — specific
dates, named people and organizations, real numbers, direct quotes where you have
them.

## 2. Write the piece

Full narrative prose throughout, same as the Daily Brief — this is a long-read, not
a bullet-point summary. Structure it as a sequence of freeform, story-specific
sections, each covering one movement in the narrative (what changed, what the
evidence actually says, what the disagreement really is, what happens next — or
whatever shape this particular story actually has). Each section gets one or more
full paragraphs. Take a real position where the evidence actually supports one —
Sandy's existing Deep Dive doesn't both-sides a question where the evidence isn't
actually balanced; it says so, plainly, while still fairly representing the
strongest version of every side.

**Prefer one tight narrative thread over a broad survey, whenever the story
supports it.** Sandy's preference, confirmed 2026-09-01: the peptide-compounding
Deep Dive (trigger → agency action → what the agency's own scientists said →
what a vote actually did and didn't do → what happens next) reads stronger than a
piece that surveys a whole topic area from several angles (geography, official
guidance, politics, myths, safety data, history, each as its own section). When
the underlying story is genuinely one process — one decision, one committee, one
vote, one reversal — follow that single thread start to finish rather than
building a general explainer around it. A topic that's genuinely diffuse (no
single process ties it together) can still get the survey treatment; but check
first whether a tighter thread is actually available before defaulting to broad.

Write a real, specific headline — same standard as the Daily Brief, never generic.
Write a one-sentence deck teasing what the piece actually covers.

**Two hard style rules, non-negotiable, added 2026-09-04: apply these while
writing, not as a later fixup.** They apply to every Wetwear piece, Deep
Dives included:
- **No em dashes, anywhere:** not in the headline, the deck, or any
  paragraph. Rework with a comma, a colon, a semicolon, or a new sentence
  instead. Sandy banned them outright; find and replace every one as you
  write, don't leave any for later.
- **No sentence over 400 characters**, in the headline, the deck, or any
  paragraph. Split it into two or three shorter sentences as you write it.

The converter script in step 4 enforces both of these as hard gates: it will
refuse to generate the `.txt` and print the offending sentence if either
rule is broken, which means going back to fix the HTML and re-running, not
patching the `.txt`. Catching both while writing avoids that round-trip.

## 3. Build the HTML page

Copy `references/deep-dive-template.html` in this skill folder and fill in every
`{{PLACEHOLDER}}`, adding as many section-label/paragraph blocks as the piece needs.
Keep the surrounding markup and the entire `<style>` block untouched — Deep Dives
share the Daily Brief's exact visual system, not a variant of it.

A few things worth getting right:
- Only the very first paragraph in the whole piece gets `class="drop-cap"`.
- The byline date format is `Sandy B. Patterson &middot; August 28, 2026` (full
  month name, no leading zero on the day).
- Sources go in citation order, not alphabetical, as `<li><a href="URL">Publication
  — Headline or description</a></li>`.
- Note this template keeps the `<script src="../../reader.js"></script>` tag at the
  bottom (the Daily Brief template doesn't load `reader.js` at all) — leave it in.

Save the finished file as `ai-news/wetwear/deep-dive-{topic-slug}.html`.

## 4. Generate the `.txt` companion

Same converter the Daily Brief uses — it isn't hardcoded to the Daily Brief's fixed
section names; any section label it doesn't recognize just gets a generic "Here's
{label, lowercased}" spoken transition, which reads fine for freeform Deep Dive
labels. **Name the output file itself as the podcast episode title**, exactly like
the Daily Brief does, since Sandy's narration app (SODA) takes an episode's title
straight from whatever filename she saves the `.txt` under — see `/CLAUDE.md`'s
Wetwear section for why:

```
python3 .claude/skills/wetwear-brief/scripts/html_to_script.py \
  ai-news/wetwear/deep-dive-{topic-slug}.html \
  "ai-news/wetwear/MM-DD Deep Dive - {{HEADLINE}}.txt" \
  "a real named source central to the story, e.g. the FDA"
```

`MM-DD` is *today's* publish date with the year cut (e.g. `08-30`), not any date
embedded in the topic itself. Example, for a Deep Dive on the peptide compounding
fight published August 28: `ai-news/wetwear/08-28 Deep Dive - The FDA Ignored Its
Own Scientists to Give RFK Jr. the Peptides He Asked For.txt`.

The third argument only fills in the intro line for a section literally labeled
"Biggest Story" (Daily Brief only) — for a Deep Dive it's effectively unused, but
the script requires an argument, so pass a real named source relevant to the story
anyway; it's harmless if it goes unused.

**The script now applies TTS formatting automatically** (added 2026-09-04),
directly on the `.txt` it generates. You don't need to hand-edit these:
- Ordinal date suffixes ("August 28" becomes "August 28th," including the
  spoken byline line).
- Name-suffix and title abbreviations: Jr. becomes Junior, Sr. becomes
  Senior, Dr. becomes Doctor, Sen. becomes Senator, Rep. becomes
  Representative. Initialisms already said as individual letters (FDA, CDC,
  WHO, HHS) are untouched, since those are fine as-is. Use judgment on any
  abbreviation outside this fixed list; the script only handles these five.
- Dollar amounts, spelled out fully in words with "dollars" at the end
  ($3.5 billion becomes "three point five billion dollars").
- Decimal numbers and percentages, read digit-by-digit after the point
  (2.5 becomes "two point five"; 44.5% becomes "forty-four point five
  percent").
- Bare calendar years (2026 becomes "twenty twenty-six"), including the
  byline year. This only catches plain 4-digit years without a comma or a
  `$` in front, so a comma-grouped figure like "2,903 cases" is correctly
  left as digits, since it isn't a year.
- Domains meant to be read aloud (cdc.gov becomes "cdc dot gov").

Skim the output anyway. The automation is deterministic, not infallible, and
a year-shaped quantity that isn't actually a year is the main thing worth
double-checking.

## 5. Add the permanent index rows

Same two files, same pattern as the Daily Brief — add a new row to the **top** of
both `ai-news/wetwear/index.html`'s archive and the unified "Issues" list in
`ai-news/index.html`, same headline, same excerpt pattern, linking to the `.html`
file (not the `.txt`):

```html
<a href="https://sandybpatterson.github.io/ai-news/wetwear/deep-dive-{topic-slug}.html" class="issue-row">
  <div class="issue-title">{{HEADLINE}}</div>
  <div class="issue-excerpt">{{Month Day, Year}} &mdash; A Wetwear Deep Dive: {{one-sentence teaser}}</div>
</a>
```

The `.issue-excerpt` for a Deep Dive conventionally opens with "A Wetwear Deep
Dive:" (see the existing peptide-compounding entry) so readers scanning the unified
list know it's a longer investigative piece before they click — the unified list
still doesn't otherwise segregate Deep Dives from Daily Briefs or hand-written
issues into their own section; this is a label within the excerpt text, not a
structural split.

Never edit, move, or remove any earlier entry's row in either file — same permanent-
entry rule as everything else in this list.

## 6. Publish

Same as the Daily Brief — sync first, then commit and push straight to `main`:

```
git fetch origin main
git log --oneline -3 origin/main   # compare against local; merge/pull if it's ahead
```

```
git add "ai-news/wetwear/deep-dive-{topic-slug}.html" "ai-news/wetwear/MM-DD Deep Dive - {{HEADLINE}}.txt" ai-news/index.html ai-news/wetwear/index.html
git commit -m "Add Wetwear Deep Dive: {{HEADLINE}}"
git push origin main
```

Confirm the push actually landed (`git log --oneline -1 origin/main` after fetching
again) before telling the user it's done.

## When you're done

Summarize the piece the way you would any finished long-read: the headline, the
core finding, and the shape of the argument. Mention that the `.txt` is already
saved under its SODA-ready name — she can grab it and drop it straight into
`new_chapters` with no renaming.
