---
name: claudetalk
description: Publishes a piece of writing to "Claude Talk" — a single, permanent, unlisted page on the site at claude-talk/index.html — instead of just replying in chat, wired up with the site's reader.js so it can be read aloud. Use whenever the user invokes /claudetalk, or asks to "write it to Claude Talk," "put that on the Claude Talk page," or similar. Every invocation overwrites the page's current content with the new piece; there is no archive.
---

# Claude Talk

## What this is

A single page at `claude-talk/index.html` — live at
`https://sandybpatterson.github.io/claude-talk/` — that Sandy uses as a personal
output page: whatever Claude writes when this skill runs replaces whatever was
there before. It's deliberately **not linked from anywhere else on the site** —
not `bookshelf.html`, not `ai-news/index.html`, no nav entry anywhere. Sandy
reaches it by going straight to the URL. Don't add a link to it from any other
page, and don't add it to any index/TOC — that would defeat the point.

Unlike the Wetwear brief, there is no archive here: one page, overwritten each
time, not a growing list of dated entries.

## 1. Write the piece

Take whatever the user asked for in the `/claudetalk` request — a topic, a
question, "just talk about whatever," a follow-up on the current conversation —
and write it as a real piece of prose meant to be read (or heard) as a finished
piece, not a chat reply. Match length and tone to the request. If the request is
open-ended, write something substantial (several paragraphs) rather than a
couple of sentences — a one-line page isn't much to listen to — but don't pad it
out artificially either. Plain paragraphs are the default; a `## ` heading or two
is fine for something longer, but this isn't a news brief with fixed sections —
write however suits the actual content.

## 2. Publish it into the page

Read `claude-talk/index.html`. Replace everything between:

```html
<!-- CLAUDE-TALK-CONTENT-START -->
...
<!-- CLAUDE-TALK-CONTENT-END -->
```

with the new piece — each paragraph as its own `<p>...</p>`, each heading as
`<h2>...</h2>`. Leave everything else in the file untouched (the `<style>`
block, the masthead, the `reader.js` script tag at the bottom) — the whole point
of the shared shell is that it doesn't change between pieces.

Update `<p class="timestamp">` to the current date, in the site's existing
format: `Written {{Month Day, Year}}` (full month name, no leading zero on the
day).

## 3. Publish

Same pattern as every other page on this site — push straight to `main`, no
branch, no PR (`CLAUDE.md`'s standing instruction). Sync first, since other
sessions sometimes work this repo concurrently:

```
git fetch origin main
git log --oneline -2 origin/main
git add claude-talk/index.html
git commit -m "Update Claude Talk"
git push origin main
git fetch origin main && git log --oneline -1 origin/main
```

Confirm the push actually landed before telling the user it's done.

## When you're done

Give the user the direct link: `https://sandybpatterson.github.io/claude-talk/`.
Don't describe it as newly created after the first run — after that, it's just
"updated."
