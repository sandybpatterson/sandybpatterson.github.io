# bookshelf-likes

Cloudflare Worker + D1 backend for the like button on each book card in
`bookshelf.html`. One table, one endpoint:

- **Table:** `book_likes (book_id TEXT PRIMARY KEY, like_count INTEGER NOT NULL DEFAULT 0)`
- **Endpoint:** `/likes`
  - `GET /likes` — returns `{ "<book_id>": <count>, ... }` for every known book
  - `POST /likes` with body `{ "book_id": "<book_id>" }` — increments that
    book's count by 1 and returns `{ "book_id": ..., "like_count": ... }`

Known `book_id` values (must match the `data-book-id` attributes in
`bookshelf.html`): `original-bug`, `beyond-ice-and-steam`,
`dead-men-on-thrones`, `stories-from-winchester`, `arden-remembers`.

## Deploy

Requires a Cloudflare account and the `wrangler` CLI (`npm i -g wrangler`,
or `npx wrangler`).

```bash
cd worker

# 1. Create the D1 database
wrangler d1 create bookshelf-likes
# Copy the returned database_id into wrangler.toml (replace
# REPLACE_WITH_YOUR_D1_DATABASE_ID).

# 2. Apply the schema
wrangler d1 execute bookshelf-likes --remote --file=./schema.sql

# 3. Deploy the Worker
wrangler deploy
```

Wrangler prints the deployed Worker URL (something like
`https://bookshelf-likes.<your-subdomain>.workers.dev`). Put that URL,
with `/likes` appended, into the `LIKES_API` constant in the like-button
script at the bottom of `bookshelf.html`.

## CORS

`src/index.js` only allows requests from `https://sandybpatterson.github.io`
(see `ALLOWED_ORIGIN`). Update that constant if the site ever moves to a
different domain.

## Local dev

```bash
wrangler d1 execute bookshelf-likes --local --file=./schema.sql
wrangler dev
```
