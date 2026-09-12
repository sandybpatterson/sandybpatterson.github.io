---
name: claudetalk
description: Publishes a piece of writing as a new permanent entry on "Claude Talk" — an unlisted archive on the site at claude-talk/, separate from claude-talk/index.html's hub list — instead of just replying in chat, wired up with the site's reader.js so it can be read aloud. Use whenever the user invokes /claudetalk, or asks to "write it to Claude Talk," "put that on the Claude Talk page," or similar. Each run adds a new entry; nothing already published is ever overwritten.
---

# Claude Talk

## What this is

An unlisted archive at `claude-talk/` — the hub is
`https://sandybpatterson.github.io/claude-talk/` — that Sandy uses as a
personal output space: each time this skill runs, Claude writes a real piece
of prose and it gets added as a new, permanent entry. It's deliberately **not
linked from anywhere else on the site** — not `bookshelf.html`, not
`ai-news/index.html`, no nav entry anywhere. Sandy reaches it by going
straight to the URL. Don't add a link to it from any other page, and don't
add it to any index/TOC on the rest of the site — that would defeat the
point.

This started as a single page that got overwritten on every run. It broke on
the second real use — running it again just destroyed the first entry — so
it now works like the Wetwear brief's archive: one hub page
(`claude-talk/index.html`) listing every entry newest-first, and each entry
as its own permanent file. **Never overwrite an existing entry file or
remove/reorder an existing row in the hub.**

## 1. Figure out today's entry number

List `claude-talk/*.html` and find any files already matching
`claude-talk/YYYY-MM-DD-N.html` for today's date. The new entry's number is
one higher than the highest `N` already used for today (or `1` if none
exist yet today). Multiple entries on the same day are expected — this
skill has no fixed cadence, unlike the Wetwear brief — so don't assume `1`
without checking.

## 2. Write the piece

Take whatever the user asked for in the `/claudetalk` request — a topic, a
question, "just talk about whatever," a follow-up on the current
conversation — and write it as a real piece of prose meant to be read (or
heard) as a finished piece, not a chat reply. Match length and tone to the
request. If the request is open-ended, write something substantial (several
paragraphs) rather than a couple of sentences — a one-line entry isn't much
to listen to — but don't pad it out artificially either. Plain paragraphs
are the default; a `## ` heading or two is fine for something longer, but
this isn't a news brief with fixed sections — write however suits the
actual content.

Write a short, real title for the piece too (not "Claude Talk — [date]" —
something specific to what the piece is actually about, the same way every
other title on this site is specific rather than generic).

## 3. Publish the entry file

Copy `references/entry-template.html` in this skill folder and fill in:
- `{{TITLE}}` (used twice: in `<title>` and as the `<h1 class="headline">`)
- `{{MONTH_DAY_YEAR}}` (full month name, no leading zero on the day)
- `{{BODY}}` — the piece, as `<p>...</p>` per paragraph and `<h2>...</h2>`
  for any headings

Keep the rest of the file — the `<style>` block, the masthead strip linking
back to `index.html`, the `reader.js` script tag — untouched.

Save it as `claude-talk/YYYY-MM-DD-N.html` using the date and number from
step 1.

## 4. Generate the audio script

Every entry gets a TTS-ready narration `.txt` alongside its HTML, the same
idea as the Wetwear brief's spoken-script companion and Dead Men on
Thrones' per-chapter narration files, just simpler, since a Claude Talk
piece has no fixed section taxonomy to narrate around:

```
python3 .claude/skills/claudetalk/scripts/entry_to_script.py \
  claude-talk/YYYY-MM-DD-N.html \
  "claude-talk/audio/MM-DD - {{TITLE}}.txt"
```

This lives in the dedicated `claude-talk/audio/` folder (created
automatically if it doesn't exist yet), named the same way Wetwear and Dead
Men on Thrones name theirs, `MM-DD - {{TITLE}}.txt`, since the site's
established convention is that a narration file's name doubles as the
episode title if it's ever dropped into SODA's `new_chapters` folder.

The script strips the HTML, spells out numbers, years, dollar amounts, and
percentages for speech the same way the other two converters do, and
enforces the 400-character sentence limit **for this .txt file only** —
the web page's own text is untouched and may legitimately run longer. It
has the same best-effort splitter for an over-limit sentence (semicolons
first, then a comma before a conjunction nearest the midpoint, then the
nearest comma); anything it truly can't split gets printed as a warning to
review by hand, not silently left broken.

Unlike the Wetwear and Dead Men on Thrones converters, this one does not
hard-fail on an em dash — Claude Talk was never put under the site's
"no em dashes" rule, so one is left alone rather than treated as an error.

Skim the output before moving on, the same as the other two converters;
the automation is deterministic, not infallible.

## 5. Add the entry to the hub

Add a new row to the **top** of the entries list in `claude-talk/index.html`,
between the `<!-- CLAUDE-TALK-ENTRIES-START -->` and
`<!-- CLAUDE-TALK-ENTRIES-END -->` markers:

```html
<a href="YYYY-MM-DD-N.html" class="entry-row">
  <div class="entry-title">{{TITLE}}</div>
  <div class="entry-date">{{Month Day, Year}}</div>
</a>
```

Never edit, move, or remove any earlier entry's row — same rule as the
Wetwear brief's index, and for the same reason: an archive that quietly
loses earlier entries isn't an archive.

## 6. Publish

Same pattern as every other page on this site — push straight to `main`, no
branch, no PR (`CLAUDE.md`'s standing instruction). Sync first, since other
sessions sometimes work this repo concurrently:

```
git fetch origin main
git log --oneline -2 origin/main
git add claude-talk/YYYY-MM-DD-N.html "claude-talk/audio/MM-DD - {{TITLE}}.txt" claude-talk/index.html
git commit -m "Add Claude Talk entry: {{TITLE}}"
git push origin main
git fetch origin main && git log --oneline -1 origin/main
```

Confirm the push actually landed before telling the user it's done.

## When you're done

Give the user the direct link to the new entry
(`https://sandybpatterson.github.io/claude-talk/YYYY-MM-DD-N.html`), and
mention the hub link if it's their first time seeing this run
(`https://sandybpatterson.github.io/claude-talk/`). Mention that the
narration `.txt` is already saved under its SODA-ready name in
`claude-talk/audio/` if it's their first time seeing that too.
