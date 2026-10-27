// Ballpark results API: a Cloudflare Pages Function backed by a D1 database bound as `DB`.
//   POST /api/results  { day, sig, player, guesses: [5 numbers], total }  stores one result per player per day
//   GET  /api/results?day=YYYY-MM-DD&sig=...                             returns { rows: [{ guesses, total }] }
// `sig` is the day's five item names joined with "|", so players are only compared on identical items.

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });

const DAY = /^\d{4}-\d{2}-\d{2}$/;
// Players can replay the last 30 days from the archive, and time zones run up to a day ahead of UTC.
function dayInRange(day) {
  const t = Date.parse(day + 'T00:00:00Z');
  return Number.isFinite(t) && t <= Date.now() + 2 * 864e5 && t >= Date.now() - 32 * 864e5;
}
const validSig = sig => typeof sig === 'string' && sig.length <= 800 && sig.split('|').length === 5;

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Body must be JSON.' }, 400); }
  const { day, sig, player, guesses, total } = body || {};
  if (typeof day !== 'string' || !DAY.test(day) || !dayInRange(day)) return json({ error: 'Unknown day.' }, 400);
  if (!validSig(sig)) return json({ error: 'Unknown item set.' }, 400);
  if (typeof player !== 'string' || !/^[A-Za-z0-9-]{8,64}$/.test(player)) return json({ error: 'Bad player id.' }, 400);
  if (!Array.isArray(guesses) || guesses.length !== 5 || !guesses.every(g => typeof g === 'number' && g > 0 && g < 1e9)) return json({ error: 'Bad guesses.' }, 400);
  if (!Number.isInteger(total) || total < 0 || total > 500) return json({ error: 'Bad total.' }, 400);
  // INSERT OR IGNORE keeps a player's first result for the day; replays don't overwrite it.
  await env.DB.prepare('INSERT OR IGNORE INTO results (day, sig, player, guesses, total, created) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
    .bind(day, sig, player, JSON.stringify(guesses), total, Date.now()).run();
  return json({ ok: true });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const day = url.searchParams.get('day') || '', sig = url.searchParams.get('sig') || '';
  if (!DAY.test(day) || !validSig(sig)) return json({ error: 'Pass day and sig.' }, 400);
  const { results } = await env.DB.prepare('SELECT guesses, total FROM results WHERE day = ?1 AND sig = ?2 ORDER BY created DESC LIMIT 5000')
    .bind(day, sig).all();
  const rows = results.map(r => ({ guesses: JSON.parse(r.guesses), total: r.total }));
  return json({ rows }, 200, { 'cache-control': 'public, max-age=30' });
}
