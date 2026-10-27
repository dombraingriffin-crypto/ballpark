const BAND_NAMES = ['Pocket change', 'Everyday', 'Splurge', 'Big purchase', 'Life savings'];
const STARTER = 100; // labeled starter players fill the crowd view until this many real players have played a day

// ---------- Utilities ----------
const $ = (s, r = document) => r.querySelector(s);
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) { if (kid == null || kid === false) continue; el.append(kid.nodeType ? kid : document.createTextNode(String(kid))); }
  return el;
}
function svg(tag, attrs = {}) { const el = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); return el; }
const icon = d => { const s = svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }); s.innerHTML = d; return s; };
function seedOf(s) { let x = 1779033703 ^ s.length; for (let i = 0; i < s.length; i++) { x = Math.imul(x ^ s.charCodeAt(i), 3432918353); x = x << 13 | x >>> 19; } x = Math.imul(x ^ x >>> 16, 2246822507); x = Math.imul(x ^ x >>> 13, 3266489909); return (x ^= x >>> 16) >>> 0; }
function rng(str) {
  let a = seedOf(str);
  const r = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  r.shuffle = arr => { const b = arr.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  return r;
}
const gauss = r => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const mod = (n, m) => ((n % m) + m) % m;
const store = {
  get(k, d) { try { const v = localStorage.getItem('ballpark:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('ballpark:' + k, JSON.stringify(v)); } catch (e) {} },
};
const EPOCH = Date.UTC(2026, 0, 1);
function dayFor(offset) {
  const d = new Date(); d.setDate(d.getDate() + offset);
  const y = d.getFullYear(), m = d.getMonth(), dd = d.getDate();
  return { offset, key: `${y}-${String(m + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}`, n: Math.round((Date.UTC(y, m, dd) - EPOCH) / 864e5) + 1, label: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) };
}
// Each band runs through every one of its items before repeating, then reshuffles. Adding items lengthens the cycle.
function itemsFor(n) {
  return rng('order:' + n).shuffle(BANDS.map((band, b) => {
    const L = band.length, cyc = Math.floor((n - 1) / L), idx = mod(n - 1, L);
    return { item: rng(`cycle:${cyc}:${b}:${L}`).shuffle(band)[idx], band: b };
  }));
}
// The first release had 12 items per band; days played then keep the items they were played with.
function legacyItemsFor(n) {
  const cyc = Math.floor((n - 1) / 12), idx = mod(n - 1, 12);
  return rng('order:' + n).shuffle(BANDS.map((band, b) => ({ item: rng(`cycle:${cyc}:${b}`).shuffle(band.slice(0, 12))[idx], band: b })));
}
const ITEM_BY_NAME = new Map(BANDS.flatMap((band, b) => band.map(item => [item[1], { item, band: b }])));
// A day's five items are saved with the day once you start, so later additions to the list never change a day you've played.
function itemsForRec(d, r) {
  if (Array.isArray(r.itemNames) && r.itemNames.length === 5 && r.itemNames.every(n => ITEM_BY_NAME.has(n))) return r.itemNames.map(n => ITEM_BY_NAME.get(n));
  return r.guesses.length ? legacyItemsFor(d.n) : itemsFor(d.n);
}
const namesOf = its => its.map(it => it.item[1]);
// Under a dollar, keep two significant digits so $0.012 doesn't round to $0.01 (but $0.70 stays $0.70).
const fmt = v => v >= 1000 ? '$' + Math.round(v).toLocaleString('en-US') : v >= 1 ? '$' + (v >= 100 && Number.isInteger(v) ? v : v.toFixed(2)) : Number(v.toFixed(2)) === Number(v.toPrecision(2)) ? '$' + v.toFixed(2) : '$' + Number(v.toPrecision(2));
const parse = s => { const m = String(s).trim().toLowerCase().replace(/[$,\s]/g, '').match(/^(\d*\.?\d+)([km]?)$/); if (!m) return NaN; return parseFloat(m[1]) * (m[2] === 'k' ? 1e3 : m[2] === 'm' ? 1e6 : 1); };
const score = (g, a) => Math.max(0, Math.round(100 * (1 - Math.abs(Math.log10(g / a)))));
const tierOf = p => p >= 90 ? 90 : p >= 70 ? 70 : p >= 40 ? 40 : 0;
const EMOJI = { 90: '🟩', 70: '🟨', 40: '🟧', 0: '🟥' };
const times = r => r >= 10 ? Math.round(r).toLocaleString('en-US') : r.toPrecision(2);
const verdictOf = (g, a) => { const r = g / a; return r >= 1.05 ? `${times(r)}× too high` : r <= 0.95 ? `${times(1 / r)}× too low` : 'Spot on'; };
const RANKS = [[450, 'Price oracle'], [380, 'Sharp shopper'], [300, 'Right ballpark'], [200, 'Window shopper'], [0, 'Sticker shocked']];
const rankOf = t => RANKS.find(r => t >= r[0])[1];
// The slider is logarithmic: 0 → $0.0001, 1100 → $10,000,000.
const fromSlider = v => Number((10 ** (-4 + v / 100)).toPrecision(2));
const toSlider = p => Math.max(0, Math.min(1100, Math.round((Math.log10(p) + 4) * 100)));

// ---------- Results server (optional) ----------
// CONFIG comes from config.js. With no API_BASE, the crowd panel uses starter players only.
const CONFIG = Object.assign({ SITE_URL: '', API_BASE: '', ADS_ENABLED: false }, window.BALLPARK_CONFIG || {});
// An anonymous random id, so the server keeps one result per browser per day. It identifies nobody.
function playerId() {
  let id = store.get('player', null);
  if (!id) { id = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)); store.set('player', id); }
  return id;
}
async function api(path, opts) {
  const r = await fetch(CONFIG.API_BASE.replace(/\/$/, '') + path, opts);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}
// Starter players: guesses spread around the real price, with the well-known habit of overpricing tiny things and underpricing huge ones.
function starters(day, items) {
  const r = rng('starters:' + day.key + ':' + namesOf(items).join('|'));
  return [...Array(STARTER)].map(() => {
    const skill = 0.45 + r() * 0.6;
    const guesses = items.map(({ item, band }) => Number((item[3] * Math.exp([0.9, 0.15, 0, -0.05, -0.2][band] + skill * gauss(r))).toPrecision(2)));
    return { guesses, total: guesses.reduce((t, g, i) => t + score(g, items[i].item[3]), 0) };
  });
}

// ---------- State ----------
let day = dayFor(0), items = itemsFor(day.n), rec = null, tickTimer = null;
const loadRec = d => store.get('day:' + d.key, null) || { guesses: [], live: d.offset === 0 };
function saveRec() { store.set('day:' + day.key, rec); }
function totalOf(r, its) { return r.guesses.reduce((t, g, i) => t + score(g, its[i].item[3]), 0); }

// ---------- Views ----------
const app = $('#app');
function header() {
  return [
    h('div', { class: 'top' },
      h('div', { class: 'logo' }, Pixel.sprite('plate', 3), h('h1', {}, 'Ballpark')),
      h('div', { class: 'icons' },
        h('button', { class: 'ibtn', type: 'button', 'aria-label': 'How to play', onclick: showHow }, icon('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><path d="M12 17.5v.01"/>')),
        h('button', { class: 'ibtn', type: 'button', 'aria-label': 'Past days', onclick: showArchive }, icon('<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>')),
        h('button', { class: 'ibtn', type: 'button', 'aria-label': 'Your stats', onclick: showStats }, icon('<path d="M5 20V11M12 20V5M19 20v-6"/>')))),
    banner(),
    h('div', { class: 'sub' }, h('span', {}, `No. ${day.n} · ${day.label}`), h('span', {}, day.offset === 0 ? 'Today' : 'Practice')),
  ];
}
function banner() { const cv = h('canvas', { class: 'banner-art', width: 160, height: 40, 'aria-hidden': 'true' }); Pixel.drawBanner(cv); return cv; }
// Progress as a ballpark line score: one inning per item, then the running total.
function steps(active) {
  const tot = rec.guesses.reduce((t, g, i) => t + score(g, items[i].item[3]), 0);
  const cells = items.map((it, i) => {
    const g = rec.guesses[i];
    if (g != null) { const p = score(g, it.item[3]); return h('div', { class: `step s${tierOf(p)}`, role: 'listitem', 'aria-label': `Item ${i + 1}: ${p} points` }, String(p)); }
    return h('div', { class: 'step' + (i === active ? ' now' : ''), role: 'listitem', 'aria-label': `Item ${i + 1}${i === active ? ', now pricing' : ''}` }, i === active ? '$' : '·');
  });
  return h('div', { class: 'linescore' },
    h('div', { class: 'lshead', 'aria-hidden': 'true' }, ...['1', '2', '3', '4', '5', 'TOT'].map(n => h('span', {}, n))),
    h('div', { class: 'steps', role: 'list', 'aria-label': `Progress, ${tot} points so far` }, ...cells, h('div', { class: 'step tot', role: 'listitem' }, String(tot))));
}
function render() {
  clearInterval(tickTimer);
  app.replaceChildren(...header());
  if (day.offset !== 0) app.append(h('p', { class: 'banner' }, 'You’re playing a past day. It counts in your stats but not your streak. ', h('a', { href: '#', onclick: e => { e.preventDefault(); goDay(0); } }, 'Back to today')));
  const i = rec.guesses.length;
  if (rec.reveal != null && rec.reveal < 5) return renderReveal(rec.reveal);
  if (i >= 5) return renderResults();
  renderGuess(i);
}
function renderGuess(i) {
  const { item: [emo, name, detail], band } = items[i];
  const input = h('input', { id: 'price', type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: '0.00', 'aria-label': `Your price for ${name}, in US dollars` });
  const slider = h('input', { id: 'price-slider', class: 'slider', type: 'range', min: 0, max: 1100, value: 450, 'aria-label': 'Price slider, from a hundredth of a cent to ten million dollars' });
  const go = h('button', { class: 'cta', type: 'submit', disabled: true }, 'Lock it in');
  const helper = h('p', { class: 'helper' }, 'Type a price, or drag the slider. 45k and 1.2m work too.');
  const sync = () => { const v = parse(input.value); go.disabled = !(v > 0); if (v > 0) slider.value = toSlider(v); };
  input.addEventListener('input', sync);
  slider.addEventListener('input', () => { input.value = fmt(fromSlider(+slider.value)).replace('$', ''); go.disabled = false; });
  const nudge = (label, f) => h('button', { class: 'nudge', type: 'button', onclick: () => { const v = parse(input.value) || fromSlider(+slider.value); const n = Number((v * f).toPrecision(2)); input.value = fmt(n).replace('$', ''); slider.value = toSlider(n); go.disabled = false; input.focus(); } }, label);
  const form = h('form', { class: 'guess', onsubmit: ev => {
    ev.preventDefault();
    const v = parse(input.value);
    if (!(v > 0)) { helper.textContent = 'That isn’t a price. Try something like 3.50, 0.02 or 45k.'; form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake'); return; }
    rec.guesses.push(Number(v.toPrecision(4))); rec.reveal = i; saveRec(); render();
  } },
    h('label', { class: 'pricebox', for: 'price' }, h('span', { 'aria-hidden': 'true' }, '$'), input),
    h('div', { class: 'nudges' }, nudge('÷10', 0.1), nudge('÷2', 0.5), nudge('×2', 2), nudge('×10', 10)),
    slider, h('div', { class: 'scale', 'aria-hidden': 'true' }, [['$0.0001', 0], ['$1', 4], ['$1k', 7], ['$1m', 10]].map(([t, d]) => h('span', { style: `left:${(100 * d / 11).toFixed(2)}%` }, t))),
    helper, go);
  app.append(steps(i), h('section', { class: 'tagcard', 'aria-live': 'polite' }, h('p', { class: 'band' }, `Item ${i + 1} of 5 · ${BAND_NAMES[band]}`), h('div', { class: 'emoji', 'aria-hidden': 'true' }, Pixel.pixelEmoji(emo)), h('h2', { class: 'iname' }, name), h('p', { class: 'idetail' }, detail), form));
  setTimeout(() => input.focus({ preventScroll: true }), 50);
}
function renderReveal(i) {
  const { item: [emo, name, detail, price, basis] } = items[i], g = rec.guesses[i], p = score(g, price), t = tierOf(p);
  const next = h('button', { class: 'cta alt', type: 'button', onclick: () => { rec.reveal = null; saveRec(); render(); } }, i < 4 ? 'Next item' : 'Print my receipt');
  app.append(steps(-1), h('section', { class: 'tagcard', 'aria-live': 'polite' },
    h('div', { class: 'emoji sm', 'aria-hidden': 'true' }, Pixel.pixelEmoji(emo)), h('h2', { class: 'iname' }, name), h('p', { class: 'idetail' }, detail),
    h('div', { class: 'bill anim' }, Pixel.sprite('coin', 3), h('span', {}, fmt(price)), Pixel.sprite('coin', 3)),
    h('p', { class: 'yours' }, `You said ${fmt(g)}`),
    h('div', { class: 'verdict' }, h('span', { class: 'pts' }, `+${p}`), h('span', { class: `pill p${t}` }, verdictOf(g, price))),
    h('p', { class: 'basis' }, `Price basis: ${basis}`), next));
  setTimeout(() => next.focus({ preventScroll: true }), 50);
}
function renderResults() {
  const total = totalOf(rec, items), grid = items.map((it, i) => EMOJI[tierOf(score(rec.guesses[i], it.item[3]))]).join('');
  if (!rec.done) { rec.done = true; rec.total = total; saveRec(); }
  const share = `Ballpark No. ${day.n} · ${total}/500\n${grid}\n${rankOf(total)}${CONFIG.SITE_URL ? '\n' + CONFIG.SITE_URL : ''}`;
  const copyBtn = h('button', { class: 'btn primary', type: 'button', onclick: () => {
    const ok = () => { copyBtn.textContent = 'Copied'; setTimeout(() => { copyBtn.textContent = 'Copy result'; }, 1600); };
    const fail = () => { const s = getSelection(), rg = document.createRange(); rg.selectNodeContents(gridEl); s.removeAllRanges(); s.addRange(rg); copyBtn.textContent = 'Press Ctrl+C'; };
    try { navigator.clipboard.writeText(share).then(ok, fail); } catch (e) { fail(); }
  } }, 'Copy result');
  const gridEl = h('p', { class: 'grid', 'aria-label': 'Score squares' }, grid);
  const receipt = h('section', { class: 'receipt', 'aria-label': 'Your receipt' },
    h('div', { class: 'rhead' }, Pixel.sprite('ball', 4), h('h2', {}, 'Ballpark'), h('p', {}, `No. ${day.n} · ${day.label}`)), h('div', { class: 'dash' }),
    ...items.map((it, i) => { const [emo, name, , price] = it.item, g = rec.guesses[i], p = score(g, price); return h('div', { class: 'rrow' }, h('span', { class: 'e', 'aria-hidden': 'true' }, Pixel.pixelEmoji(emo, 16)), h('div', {}, h('div', { class: 'n' }, name), h('div', { class: 'm' }, `Real ${fmt(price)} · you ${fmt(g)}`)), h('span', { class: 'p num' }, `+${p}`)); }),
    h('div', { class: 'dash' }), h('div', { class: 'total' }, h('span', {}, 'TOTAL'), h('b', { class: 'num' }, `${total}/500`)), h('p', { class: 'rank' }, rankOf(total)), gridEl);
  const crowd = h('section', { class: 'panel', 'aria-live': 'polite' }, h('h3', {}, 'How everyone did'), h('p', { class: 'note' }, 'Loading the crowd…'));
  const cd = h('p', { class: 'countdown' }, 'Next prices in', h('b', { class: 'num' }, '--:--:--'));
  const tick = () => { const now = new Date(), mid = new Date(now); mid.setHours(24, 0, 0, 0); const s = Math.max(0, Math.floor((mid - now) / 1000)); cd.lastChild.textContent = [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(x => String(x).padStart(2, '0')).join(':'); };
  tick(); tickTimer = setInterval(tick, 1000);
  app.append(steps(-1), receipt, h('div', { class: 'actions' }, copyBtn, h('button', { class: 'btn', type: 'button', onclick: showStats }, 'Your stats')), crowd, adSlot('results'), cd);
  loadCrowd(crowd, total);
}
async function loadCrowd(panel, total) {
  const thisDay = day.key, base = starters(day, items), sig = namesOf(items).join('|');
  const draw = (real, note) => {
    if (day.key !== thisDay || !panel.isConnected) return;
    const need = Math.max(0, STARTER - real.length), pool = [...real, ...base.slice(0, need)];
    const totals = pool.map(p => p.total).filter(Number.isFinite), beat = totals.filter(t => t < total).length;
    const pctBeat = Math.round(100 * beat / Math.max(1, totals.length));
    const bins = Array(10).fill(0); totals.forEach(t => bins[Math.min(9, Math.floor(t / 50))]++); const mx = Math.max(1, ...bins), myBin = Math.min(9, Math.floor(total / 50));
    const hist = svg('svg', { class: 'hist', viewBox: '0 0 320 110', role: 'img', 'aria-label': `Score distribution. You beat ${pctBeat}% of players.` });
    bins.forEach((b, i) => hist.append(svg('rect', { x: 4 + i * 31.5, y: 88 - 80 * b / mx, width: 27, height: Math.max(1, 80 * b / mx), rx: 3, class: 'hbar' + (i === myBin ? ' me' : '') })));
    [['0', 4], ['250', 152], ['500', 296]].forEach(([t, x]) => { const e = svg('text', { x, y: 104, class: 'axis' }); e.textContent = t; hist.append(e); });
    const med = i => { const v = pool.map(p => p.guesses && p.guesses[i]).filter(x => x > 0).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : NaN; };
    panel.replaceChildren(h('h3', {}, 'How everyone did'),
      h('p', {}, `You beat ${pctBeat}% of players today.`), hist,
      h('div', { class: 'ctable' }, h('div', { class: 'crow note' }, h('span'), h('span', {}, 'Item'), h('span', {}, 'Crowd guess'), h('span', {}, 'Real')),
        ...items.map((it, i) => h('div', { class: 'crow' }, h('span', { 'aria-hidden': 'true' }, Pixel.pixelEmoji(it.item[0], 16)), h('span', {}, it.item[1]), h('span', { class: 'mono muted' }, fmt(med(i))), h('span', { class: 'mono' }, fmt(it.item[3]))))),
      h('p', { class: 'note' }, note + (need ? ` Includes ${need} starter players modeled on how people usually misjudge prices; they drop out as real players finish.` : '')));
  };
  if (!CONFIG.API_BASE) return draw([], 'The results server isn’t set up yet, so you’re compared with starter players only.');
  if (!rec.sent) {
    try { await api('/results', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ day: day.key, sig, player: playerId(), guesses: rec.guesses, total }) }); rec.sent = true; saveRec(); }
    catch (e) { /* still show everyone else's results below */ }
  }
  try {
    // Only players who priced the same five items come back, so a list change mid-day can't mix up results.
    const data = await api(`/results?day=${encodeURIComponent(day.key)}&sig=${encodeURIComponent(sig)}`);
    const real = (data.rows || []).filter(v => Array.isArray(v.guesses) && v.guesses.length === 5 && Number.isFinite(v.total));
    draw(real, `${real.length} real player${real.length === 1 ? '' : 's'} so far.`);
  } catch (e) { draw([], 'The results server didn’t answer, so you’re compared with starter players only.'); }
}

// ---------- Ads ----------
// Reserved space for one ad on the results screen. Nothing shows until ADS_ENABLED is true in config.js
// and an ad network's code is added (see README). The slot keeps a fixed height so the page doesn't jump.
function adSlot(name) {
  if (!CONFIG.ADS_ENABLED) return null;
  return h('aside', { class: 'adslot', 'data-slot': name, 'aria-label': 'Advertisement' }, h('span', { class: 'adlabel' }, 'Advertisement'));
}

// ---------- Modals ----------
function modal(title, ...body) {
  const root = $('#modal-root'), prev = document.activeElement;
  const close = () => { root.replaceChildren(); document.removeEventListener('keydown', onKey); prev && prev.focus && prev.focus(); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  const x = h('button', { class: 'ibtn', type: 'button', 'aria-label': 'Close', onclick: close }, icon('<path d="M6 6l12 12M18 6L6 18"/>'));
  const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, h('header', {}, h('h2', {}, title), x), ...body);
  const wrap = h('div', { class: 'modal', onclick: e => { if (e.target === wrap) close(); } }, sheet);
  root.replaceChildren(wrap); document.addEventListener('keydown', onKey); x.focus();
  return close;
}
function showHow() {
  modal('How to play', h('div', { class: 'how', style: 'display:grid;gap:12px' },
    h('p', {}, 'Every day there are five things to price, one from each range: pocket change, everyday, splurge, big purchase and life savings. Everyone gets the same five.'),
    h('p', {}, 'Type a price in US dollars or drag the slider. The slider jumps by powers of ten, so you can get from a penny to a Porsche in one swipe. Use ÷2 and ×2 to fine-tune.'),
    h('p', {}, 'You score by how close you are in ratio, not dollars, so missing a pea by 2× hurts exactly as much as missing a car by 2×.'),
    h('div', { class: 'scoretable' }, h('b', {}, '100'), h('span', {}, 'Exactly right'), h('b', {}, '90'), h('span', {}, 'Within about 25%'), h('b', {}, '70'), h('span', {}, 'Off by 2×'), h('b', {}, '40'), h('span', {}, 'Off by 4×'), h('b', {}, '0'), h('span', {}, 'Off by 10× or more')),
    h('p', { class: 'note' }, 'Prices are typical US prices from 2024–26: list prices where a product has one, national averages or survey figures otherwise. Items marked “approx.” are rounded estimates. Real prices vary by store and state.')));
}
function allRecs() {
  const out = [];
  try { for (let k = 0; k < localStorage.length; k++) { const key = localStorage.key(k); if (key && key.startsWith('ballpark:day:')) { const r = JSON.parse(localStorage.getItem(key)); if (r && r.done) out.push({ key: key.slice(13), ...r }); } } } catch (e) {}
  return out.sort((a, b) => a.key.localeCompare(b.key));
}
function showStats() {
  const recs = allRecs(), played = recs.length, avg = played ? Math.round(recs.reduce((t, r) => t + r.total, 0) / played) : 0, best = played ? Math.max(...recs.map(r => r.total)) : 0;
  const liveKeys = new Set(recs.filter(r => r.live).map(r => r.key));
  let streak = 0; for (let o = liveKeys.has(dayFor(0).key) ? 0 : -1; liveKeys.has(dayFor(o).key); o--) streak++;
  const bins = Array(5).fill(0); recs.forEach(r => bins[Math.min(4, Math.floor(r.total / 100))]++); const mx = Math.max(1, ...bins);
  const todayRec = store.get('day:' + dayFor(0).key, null), myBin = todayRec && todayRec.done ? Math.min(4, Math.floor(todayRec.total / 100)) : -1;
  modal('Your stats',
    h('div', { class: 'statgrid' }, h('div', {}, h('b', {}, String(played)), h('span', {}, 'Played')), h('div', {}, h('b', {}, String(avg)), h('span', {}, 'Average')), h('div', {}, h('b', {}, String(best)), h('span', {}, 'Best')), h('div', {}, h('b', {}, String(streak)), h('span', {}, 'Streak'))),
    h('div', { class: 'dist' }, ['0–99', '100–199', '200–299', '300–399', '400–500'].map((lab, i) => h('div', { class: 'drow' + (i === myBin ? ' me' : '') }, h('span', {}, lab), h('i', { style: `width:${Math.max(6, 100 * bins[i] / mx)}%` }, String(bins[i]))))),
    played ? null : h('p', { class: 'note' }, 'Finish a day to start your stats.'),
    h('p', { class: 'note' }, 'Stats are saved in this browser only.'));
}
function showArchive() {
  const close = modal('Past days', h('p', { class: 'note' }, 'Every day has its own five prices. Past days count in your stats, but only today keeps your streak going.'),
    h('div', { class: 'days' }, [...Array(30).keys()].map(k => {
      const d = dayFor(-k), r = store.get('day:' + d.key, null);
      return h('button', { type: 'button', class: 'day' + (k === 0 ? ' today' : ''), onclick: () => { close(); goDay(-k); } },
        h('span', {}, h('b', {}, `No. ${d.n}`), ' ', h('span', { class: 'mono' }, k === 0 ? 'Today' : d.label)),
        h('span', { class: 'mono' }, r && r.done ? `${r.total}/500` : r && r.guesses && r.guesses.length ? `${r.guesses.length}/5 played` : 'Play'));
    })));
}
function goDay(offset) {
  day = dayFor(offset); rec = loadRec(day); items = itemsForRec(day, rec);
  rec.itemNames = namesOf(items);
  render(); window.scrollTo(0, 0);
}

// ---------- Color schemes ----------
// The visitor's saved scheme wins; otherwise CONFIG.SCHEME. The picker in the footer is for choosing one before launch.
function schemePicker() {
  const root = $('#scheme-picker'); if (!root) return;
  if (!CONFIG.SHOW_SCHEME_PICKER) { root.hidden = true; return; }
  const current = document.documentElement.getAttribute('data-scheme') || 'stadium';
  root.hidden = false;
  root.replaceChildren(h('p', {}, 'Color scheme (preview)'), h('div', { class: 'schemes' }, Pixel.SCHEMES.map(s => h('button', { type: 'button', class: 'schemebtn', 'aria-pressed': s.id === current ? 'true' : 'false', onclick: () => Pixel.setScheme(s.id) },
    h('span', { class: 'swatches', 'aria-hidden': 'true' }, s.swatch.map(c => h('i', { style: `background:${c}` }))), s.name))));
}
if (CONFIG.SHOW_SCHEME_PICKER) Pixel.setScheme(Pixel.getScheme() || CONFIG.SCHEME || 'stadium', false);
else { Pixel.clearScheme(); Pixel.setScheme(CONFIG.SCHEME || 'stadium', false); } // a scheme saved while previewing never overrides the launch scheme
// Redraw when the scheme or the light/dark setting changes, since the banner and sprites read the colors.
document.addEventListener('schemechange', () => { render(); schemePicker(); });
try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => render()); } catch (e) {}

// ---------- Boot ----------
schemePicker();
goDay(0);
if (!store.get('seenHow', false)) { store.set('seenHow', true); showHow(); }
