// Ballpark results API: a Cloudflare Pages Function backed by a D1 database bound as `DB`.
//   POST /api/results  { day, sig, player, guesses: [5 numbers] }  stores one result per player per day
//   GET  /api/results?day=YYYY-MM-DD&sig=...                       returns { rows: [{ guesses, total }] }
// `sig` is the day's five item names joined with "|", so players are only compared on identical items.
// Scores are worked out here from the item list, never taken from the browser, so a total can't be faked.
import BANDS from '../../public/assets/items.js';

const PRICE = new Map(BANDS.flat().map(item => [item[1], item[3]]));
// Same formula as the game: 100 for exact, 0 for 10× off or more, on a log scale.
const score = (guess, actual) => Math.max(0, Math.round(100 * (1 - Math.abs(Math.log10(guess / actual)))));

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });

const DAY = /^\d{4}-\d{2}-\d{2}$/;
// Players can replay the last 30 days from the archive, and time zones run up to a day ahead of UTC.
function dayInRange(day) {
  const t = Date.parse(day + 'T00:00:00Z');
  return Number.isFinite(t) && t <= Date.now() + 2 * 864e5 && t >= Date.now() - 32 * 864e5;
}
// A valid item set is five different names that are all in the item list.
function pricesFor(sig) {
  if (typeof sig !== 'string' || sig.length > 800) return null;
  const names = sig.split('|');
  if (names.length !== 5 || new Set(names).size !== 5 || !names.every(n => PRICE.has(n))) return null;
  return names.map(n => PRICE.get(n));
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Body must be JSON.' }, 400); }
  const { day, sig, player, guesses } = body || {};
  if (typeof day !== 'string' || !DAY.test(day) || !dayInRange(day)) return json({ error: 'Unknown day.' }, 400);
  const prices = pricesFor(sig);
  if (!prices) return json({ error: 'Unknown item set.' }, 400);
  if (typeof player !== 'string' || !/^[A-Za-z0-9-]{8,64}$/.test(player)) return json({ error: 'Bad player id.' }, 400);
  if (!Array.isArray(guesses) || guesses.length !== 5 || !guesses.every(g => typeof g === 'number' && g > 0 && g < 1e9)) return json({ error: 'Bad guesses.' }, 400);
  const total = guesses.reduce((t, g, i) => t + score(g, prices[i]), 0);
  // INSERT OR IGNORE keeps a player's first result for the day; replays don't overwrite it.
  await env.DB.prepare('INSERT OR IGNORE INTO results (day, sig, player, guesses, total, created) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
    .bind(day, sig, player, JSON.stringify(guesses), total, Date.now()).run();
  return json({ ok: true, total });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const day = url.searchParams.get('day') || '', sig = url.searchParams.get('sig') || '';
  if (!DAY.test(day) || !pricesFor(sig)) return json({ error: 'Pass day and sig.' }, 400);
  const { results } = await env.DB.prepare('SELECT guesses, total FROM results WHERE day = ?1 AND sig = ?2 ORDER BY created DESC LIMIT 5000')
    .bind(day, sig).all();
  const rows = results.map(r => ({ guesses: JSON.parse(r.guesses), total: r.total }));
  return json({ rows }, 200, { 'cache-control': 'public, max-age=30' });
}
