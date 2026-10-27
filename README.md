# Ballpark

A daily price-guessing game: five things a day, from a single pea to a sports car.

The site is plain HTML, CSS and JavaScript with no build step. An optional results server records anonymous scores so players can see how they compare. It's set up for **Cloudflare Pages** (free tier) with a **D1** database, but the static part runs on any host.

## What's in the folder

```
public/                 Everything the browser loads
  index.html            The game page, with search and social-sharing tags
  about.html            How to play, scoring and price sources (a crawlable page for Google)
  privacy.html          Privacy policy draft (needed before adding ads)
  404.html              Not-found page
  robots.txt, sitemap.xml, manifest.webmanifest, _headers
  assets/
    config.js           Site settings: your URL, the results server, ads on or off
    items.js            The item list. Add new items here.
    app.js              The game
    styles.css          All styles, light and dark
    icon.svg, icon-192.png, icon-512.png, og-image.png
functions/api/results.js   The results server (Cloudflare Pages Function)
schema.sql                 Database table for results
wrangler.toml              Cloudflare project settings
```

## Try it on your computer

```bash
python3 -m http.server 8000 -d public
```

Then open http://localhost:8000. The results server doesn't run this way, so the "How everyone did" panel uses starter players only. That's expected.

## Before you publish

1. **Pick a domain** and replace `YOUR-DOMAIN` everywhere it appears: `public/index.html`, `about.html`, `privacy.html`, `robots.txt` and `sitemap.xml`.
2. In `public/assets/config.js`, set `SITE_URL` to your address so shared results include a link.
3. In `privacy.html`, fill in the date and a contact email, and have the policy reviewed.
4. Check the name: search app stores and the web for other games called "Ballpark".
5. Spot-check prices marked `approx.` in `items.js`.

## Deploy on Cloudflare Pages

You need a free Cloudflare account and, ideally, this folder in a GitHub repository.

1. **Create the database.** In the Cloudflare dashboard go to *Storage & Databases → D1 → Create*, name it `ballpark`, then open its *Console* and paste in the contents of `schema.sql`. Copy the database ID into `wrangler.toml`.
2. **Create the site.** Go to *Workers & Pages → Create → Pages*, connect your GitHub repository, and set the build output directory to `public` (leave the build command empty).
3. **Connect the database.** In the Pages project, open *Settings → Bindings*, add a **D1 database** binding named `DB`, and pick `ballpark`. Redeploy.
4. **Add your domain** under *Custom domains*.
5. **Check it works:** finish a day, then open `https://YOUR-DOMAIN/api/results?day=YYYY-MM-DD&sig=x|x|x|x|x`. It should return JSON instead of an error.

If you prefer the command line, install Node.js and run `npx wrangler pages deploy` from this folder.

## Getting found on Google

1. Add the site to **Google Search Console** (search.google.com/search-console) and verify it. Cloudflare can add the DNS record for you.
2. Submit `https://YOUR-DOMAIN/sitemap.xml` under *Sitemaps*.
3. Use *URL Inspection* on the home page and request indexing.
4. What helps most after that: people sharing results (every share includes your link once `SITE_URL` is set), links from puzzle-game lists and Reddit communities, and keeping `about.html` useful.

## Adding ads later (like Krillion)

Most daily games earn money from display ads, sometimes with a paid "no ads" option. A sensible order:

1. Get some steady traffic first. Ad networks usually reject brand-new sites.
2. Apply to **Google AdSense** (or a games-focused network). It needs the privacy policy, the about page and real content, all of which are in place.
3. When approved: paste the network's script into `<head>` in `index.html` where the comment marks the spot, add the `ads.txt` file they give you to `public/`, put their ad unit code inside `adSlot()` in `app.js`, and set `ADS_ENABLED: true` in `config.js`. The reserved slot sits below the results so ads never interrupt a guess.
4. For visitors in the EEA, the UK and Switzerland, Google requires a consent banner from a certified provider. AdSense offers one built in.
5. Update `privacy.html` to name the ad network and explain its cookies.

Later options: a "Ballpark+" tier with unlimited archive and no ads, sponsored themed weeks, or an embeddable widget for news sites.

## Look and color schemes

The art is pixel-style and drawn in code, so it always matches the active colors: the sprites (baseball, coin, dollar bill, home-plate logo) and the ballpark banner live in `public/assets/pixel.js`, and item emoji are pixelated on the player's own device.

There are three color schemes, each with a day look and a night look (the night look follows the visitor's dark-mode setting):

- **Stadium**: sky blue, outfield green and stitch red; at night, navy under the lights.
- **Greenback**: dollar-bill greens and gold.
- **Scoreboard**: concrete grey and hunter green; at night, a dark board with amber bulbs.

The site launches with **Stadium** (`SCHEME` in `config.js`) and the preview buttons hidden (`SHOW_SCHEME_PICKER: false`). To compare schemes again, set `SHOW_SCHEME_PICKER: true`; buttons appear in the footer. The icons (`icon.svg`, `icon-192.png`, `icon-512.png`) and the share image (`og-image.png`) are drawn in Stadium colors, so redraw them if you switch. To change colors, edit the table in `tools/schemes.py` and run `python3 tools/schemes.py`; it rewrites the color section at the top of `styles.css`.

## Adding items

Open `public/assets/items.js` and append to the right band:

```js
['🧃', 'A juice box', 'From a 10-pack', 0.45, 'approx.'],
```

Fields: emoji, a unique name, a detail line, the US price in dollars, and the price basis players see. Bands: 0 under $1, 1 $1–$20, 2 $20–$500, 3 $500–$20,000, 4 over $20,000. Each band cycles through all its items before repeating, and days people have already played keep their original items.

## How the results server works

- When a player finishes, the game sends the date, the day's five item names, their five guesses, their score and an anonymous random ID from their browser. One result per ID per day is kept.
- The game asks for that day's results and only compares players who priced the same five items.
- Until 100 real players have finished a day, labeled starter players fill in the comparison.
- The server checks every field's format, but scores come from the browser and could be faked. For a public leaderboard, have the server recompute scores from `items.js`.
