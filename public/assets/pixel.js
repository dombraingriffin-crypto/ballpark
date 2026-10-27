// Pixel art for Ballpark: sprites drawn from text grids, the ballpark banner, pixelated item emoji,
// and the color-scheme switch. Every color comes from the active scheme's CSS tokens.
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  // Sprite letters → CSS token names (.px-<token> classes in styles.css).
  const PAL = { K: 'outline', W: 'chalk', R: 'stitch', G: 'bill', g: 'bill2', D: 'bill3', Y: 'gold', y: 'gold2', o: 'gold3' };
  const SPRITES = {
    ball: [
      '....KKKK....',
      '..KKWWWWKK..',
      '.KWRWWWWRWK.',
      '.KWWRWWRWWK.',
      'KWWWRWWRWWWK',
      'KWWRWWWWRWWK',
      'KWWRWWWWRWWK',
      'KWWWRWWRWWWK',
      '.KWWRWWRWWK.',
      '.KWRWWWWRWK.',
      '..KKWWWWKK..',
      '....KKKK....',
    ],
    coin: [
      '..KKKKKK..',
      '.KoYYYYYK.',
      'KoYYyyyYYK',
      'KYYyYYYYYK',
      'KYYYyyYYYK',
      'KYYYYYyYYK',
      'KYYyyyYYYK',
      'KYYYYYYYyK',
      '.KYYYYYyK.',
      '..KKKKKK..',
    ],
    bill: [
      'KKKKKKKKKKKKKKKKKKKKKK',
      'KggggggggggggggggggggK',
      'KgGGGGGGGGGGGGGGGGGGgK',
      'KgGDDGGGGGWWWGGGGDDGgK',
      'KgGDGGGGGWWDWWGGGGDGgK',
      'KgGGGGGGGWDDDWGGGGGGgK',
      'KgGDGGGGGWWDWWGGGGDGgK',
      'KgGDDGGGGGWWWGGGGDDGgK',
      'KgGGGGGGGGGGGGGGGGGGgK',
      'KggggggggggggggggggggK',
      'KKKKKKKKKKKKKKKKKKKKKK',
    ],
    // Home plate as a price tag: the logo.
    plate: [
      'KKKKKKKKKKKKKK',
      'KWWWWWWWWWWWWK',
      'KWKKWWWWWWWWWK',
      'KWKKWWWRRRWWWK',
      'KWWWWWWRWWWWWK',
      'KWWWWWWRRRWWWK',
      'KWWWWWWWWRWWWK',
      '.KWWWWWRRRWWK.',
      '..KWWWWWRWWK..',
      '...KWWWWWWK...',
      '....KWWWWK....',
      '.....KWWK.....',
      '......KK......',
    ],
  };

  // Draws a sprite as crisp SVG rects, merging same-color runs to keep the markup small.
  function sprite(name, px = 4) {
    const rows = SPRITES[name], w = Math.max(...rows.map(r => r.length)), ht = rows.length;
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', `0 0 ${w} ${ht}`);
    s.setAttribute('width', w * px); s.setAttribute('height', ht * px);
    s.setAttribute('shape-rendering', 'crispEdges'); s.setAttribute('aria-hidden', 'true');
    s.setAttribute('class', 'px px-' + name);
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length;) {
        const c = row[x]; let n = 1;
        while (row[x + n] === c) n++;
        if (PAL[c]) { const r = document.createElementNS(NS, 'rect'); r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', n); r.setAttribute('height', 1); r.setAttribute('class', 'px-' + PAL[c]); s.append(r); }
        x += n;
      }
    });
    return s;
  }

  // Item emoji drawn small and scaled up without smoothing, so every item reads as pixel art.
  function pixelEmoji(emoji, res = 20) {
    const cv = document.createElement('canvas'); cv.width = cv.height = res;
    const c = cv.getContext('2d');
    c.font = `${Math.round(res * 0.84)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(emoji, res / 2, res / 2 + res * 0.06);
    cv.className = 'pxemoji'; cv.setAttribute('aria-hidden', 'true');
    return cv;
  }

  // 3×5 bulb letters for the scoreboard.
  const GLYPH = {
    B: ['XX.', 'X.X', 'XX.', 'X.X', 'XX.'], A: ['.X.', 'X.X', 'XXX', 'X.X', 'X.X'], L: ['X..', 'X..', 'X..', 'X..', 'XXX'],
    P: ['XX.', 'X.X', 'XX.', 'X..', 'X..'], R: ['XX.', 'X.X', 'XX.', 'X.X', 'X.X'], K: ['X.X', 'X.X', 'XX.', 'X.X', 'X.X'],
    $: ['.XX', 'XX.', '.X.', '.XX', 'XX.'],
  };

  // The ballpark banner, drawn at 160×40 and scaled up by CSS.
  function drawBanner(cv) {
    const W = 160, H = 40; cv.width = W; cv.height = H;
    const c = cv.getContext('2d'), css = getComputedStyle(document.documentElement), t = n => css.getPropertyValue('--' + n).trim() || '#888';
    const night = t('night') === '1';
    let seed = 7; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const px = (x, y, col, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    // Sky with a dithered band near the horizon.
    px(0, 0, t('sky'), W, 20);
    for (let y = 12; y < 20; y++) for (let x = (y % 2); x < W; x += 2) if (y > 15 || x % 4 === y % 4) px(x, y, t('sky2'));
    if (night) {
      for (let i = 0; i < 40; i++) px(Math.floor(rand() * W), Math.floor(rand() * 11), t('chalk'));
      // Light towers.
      [[8, 2], [146, 2]].forEach(([x, y]) => { px(x + 2, y + 3, t('wall2'), 2, 15); px(x, y, t('gold3'), 6, 3); for (let i = 0; i < 3; i++) px(x + i * 2, y + 1, t('gold'), 1, 1); });
    } else {
      [[14, 4], [56, 2], [92, 6]].forEach(([x, y]) => { px(x + 2, y, t('chalk'), 10, 2); px(x, y + 2, t('chalk'), 16, 2); px(x + 4, y + 4, t('sky2'), 8, 1); });
      px(146, 3, t('gold3'), 6, 6); px(147, 2, t('gold3'), 4, 8); px(145, 4, t('gold3'), 8, 4);
    }
    // Stands full of fans.
    px(0, 18, t('stand1'), W, 8);
    const fans = [t('stand2'), t('chalk'), t('stitch'), t('gold'), t('bill2'), t('stand2')];
    for (let y = 19; y < 26; y += 2) for (let x = (y % 4 === 1 ? 0 : 1); x < W; x += 2) if (rand() < 0.7) px(x, y, fans[Math.floor(rand() * fans.length)]);
    // Scoreboard with bulb lettering.
    const sx = 104, sy = 3;
    px(sx - 1, sy - 1, t('outline'), 42, 18); px(sx, sy, t('wall2'), 40, 16); px(sx + 18, sy + 16, t('outline'), 4, 6);
    let gx = sx + 4;
    'BALLPARK'.split('').forEach(ch => { GLYPH[ch].forEach((r, yy) => [...r].forEach((b, xx) => { if (b === 'X') px(gx + xx, sy + 3 + yy, t('gold')); })); gx += 4; });
    gx = sx + 9; ['$', '$', '$', '$', '$', '$'].forEach(ch => { GLYPH[ch].forEach((r, yy) => [...r].forEach((b, xx) => { if (b === 'X') px(gx + xx, sy + 10 + yy, t('bill2')); })); gx += 4; });
    // Outfield wall with the home-run line.
    px(0, 26, t('wall'), W, 5); px(0, 26, t('gold'), W, 1);
    for (let x = 10; x < W; x += 30) { px(x, 28, t('wall2'), 6, 2); }
    // Mowed grass and the infield.
    for (let x = 0; x < W; x += 8) px(x, 31, (x / 8) % 2 ? t('grass') : t('grass2'), 8, H - 31);
    c.fillStyle = t('clay'); c.beginPath(); c.moveTo(20, H); c.lineTo(44, 33); c.lineTo(68, H); c.closePath(); c.fill();
    px(43, 33, t('chalk'), 2, 2); px(30, 37, t('chalk'), 2, 2); px(56, 37, t('chalk'), 2, 2);
    for (let i = 0; i < 26; i++) px(68 + i * 3, 39 - Math.floor(i / 3), t('chalk'));
    // A home run in flight, with dollar bills fluttering behind it.
    const ball = [[1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [3, 1], [0, 2], [1, 2], [2, 2], [3, 2], [1, 3], [2, 3]];
    ball.forEach(([x, y]) => px(78 + x, 6 + y, t('chalk'))); px(79, 7, t('stitch')); px(80, 8, t('stitch'));
    for (let i = 1; i < 6; i++) px(78 - i * 4, 8 + i, t('chalk'));
    [[60, 9], [70, 15], [88, 12]].forEach(([x, y]) => { px(x, y, t('bill3'), 7, 4); px(x + 1, y + 1, t('bill'), 5, 2); px(x + 3, y + 1, t('chalk'), 1, 2); });
  }

  // Color schemes. Each has a day look and a night look; the visitor's light/dark setting picks between them.
  const SCHEMES = [
    { id: 'stadium', name: 'Stadium', swatch: ['#7CC6F6', '#4FAE4E', '#D7263D', '#FFC531'] },
    { id: 'greenback', name: 'Greenback', swatch: ['#2F6B3F', '#A6D19B', '#E3B23C', '#0F2A1A'] },
    { id: 'scoreboard', name: 'Scoreboard', swatch: ['#0F1F17', '#1F5135', '#FFB000', '#F2F2E6'] },
  ];
  function getScheme() { try { const v = JSON.parse(localStorage.getItem('ballpark:scheme')); if (SCHEMES.some(s => s.id === v)) return v; } catch (e) {} return null; }
  function setScheme(id, save = true) {
    document.documentElement.setAttribute('data-scheme', id);
    if (save) { try { localStorage.setItem('ballpark:scheme', JSON.stringify(id)); } catch (e) {} }
    document.dispatchEvent(new CustomEvent('schemechange', { detail: id }));
  }

  function clearScheme() { try { localStorage.removeItem('ballpark:scheme'); } catch (e) {} }

  // Paints a sprite onto a canvas in the current scheme's colors (used for icons and the share image).
  function paintSprite(c, name, x0, y0, px) {
    const css = getComputedStyle(document.documentElement);
    SPRITES[name].forEach((row, y) => [...row].forEach((ch, x) => { if (PAL[ch]) { c.fillStyle = css.getPropertyValue('--' + PAL[ch]).trim(); c.fillRect(x0 + x * px, y0 + y * px, px, px); } }));
  }

  window.Pixel = { sprite, pixelEmoji, drawBanner, paintSprite, SPRITES, PAL, SCHEMES, getScheme, setScheme, clearScheme };
  // Text pages: swap the logo placeholder for the pixel plate.
  document.querySelectorAll('.logo-tag').forEach(el => el.replaceWith(sprite('plate', 3)));
})();
