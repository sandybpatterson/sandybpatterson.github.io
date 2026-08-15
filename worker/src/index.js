const ALLOWED_BOOK_IDS = [
  'original-bug',
  'beyond-ice-and-steam',
  'dead-men-on-thrones',
  'stories-from-winchester',
  'arden-remembers',
];

const ALLOWED_ORIGIN = 'https://sandybpatterson.github.io';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    if (url.pathname !== '/likes') {
      return json({ error: 'Not found' }, 404);
    }

    if (request.method === 'GET') {
      const { results } = await env.DB.prepare(
        'SELECT book_id, like_count FROM book_likes'
      ).all();

      const counts = {};
      for (const bookId of ALLOWED_BOOK_IDS) counts[bookId] = 0;
      for (const row of results) counts[row.book_id] = row.like_count;

      return json(counts);
    }

    if (request.method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: 'Invalid JSON body' }, 400);
      }

      const bookId = body && body.book_id;
      if (!ALLOWED_BOOK_IDS.includes(bookId)) {
        return json({ error: 'Unknown book_id' }, 400);
      }

      await env.DB.prepare(
        `INSERT INTO book_likes (book_id, like_count) VALUES (?, 1)
         ON CONFLICT(book_id) DO UPDATE SET like_count = like_count + 1`
      ).bind(bookId).run();

      const row = await env.DB.prepare(
        'SELECT like_count FROM book_likes WHERE book_id = ?'
      ).bind(bookId).first();

      return json({ book_id: bookId, like_count: row.like_count });
    }

    return json({ error: 'Method not allowed' }, 405);
  },
};
