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
tools/set-domain.sh        Puts your domain into every file that needs it
tools/stamp-assets.py      Run after changing anything in public/assets, so players get the new files
launch-posts.md            Draft posts for launch day
```

## Publishing a change

Pushing to GitHub redeploys the site in about ten seconds. If you changed anything in `public/assets` (the game, the styles, the item list or the settings), run `python3 tools/stamp-assets.py` before you commit. Cloudflare and browsers keep those files for hours; the script puts a version on their addresses in the pages so everyone gets the new ones straight away.

## Try it on your computer

```bash
python3 -m http.server 8000 -d public
```

Then open http://localhost:8000. The results server doesn't run this way, so the "How everyone did" panel uses starter players only. That's expected.

## Before you publish

1. **Pick a domain**, then run `sh tools/set-domain.sh yourdomain.com`. It replaces `YOUR-DOMAIN` in every page, `robots.txt` and `sitemap.xml`, and sets `SITE_URL` in `public/assets/config.js` so shared results include a link.
2. Drafts of launch posts are in `launch-posts.md`.
3. In `privacy.html`, fill in the date and a contact email, and have the policy reviewed.
4. Check the name: search app stores and the web for other games called "Ballpark".
5. Spot-check prices marked `approx.` in `items.js`.

## Deploy on Cloudflare Pages

You need a free Cloudflare account and, ideally, this folder in a GitHub repository.

1. **Create the database.** In the Cloudflare dashboard go to *Storage & Databases → D1 → Create*, name it `ballpark`, then open its *Console* and paste in the contents of `schema.sql`. Copy the database ID into `wrangler.toml`.
2. **Create the site.** Go to *Workers & Pages → Create → Pages*, connect your GitHub repository, and set the build output directory to `public` (leave the build command empty).
3. **Connect the database.** In the Pages project, open *Settings → Bindings*, add a **D1 database** binding named `DB`, and pick `ballpark`. Redeploy.
4. **Add your domain** under *Custom domains*.
5. **Check it works:** finish a day on the live site. The note under "How everyone did" should say "1 real player so far" instead of "The results server didn't answer".

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

## Look and colors

The site has one look with a day and a night version; the night version follows the visitor's dark-mode setting. All colors are the tokens in the first two blocks of `public/assets/styles.css` (`--primary` is the green, `--accent` the gold). Type is Bricolage Grotesque for headings and numbers and Instrument Sans for text, both loaded from Google Fonts.

The logo is a home plate drawn as a price tag. It lives in three places: `MARK` in `app.js`, the inline SVG at the top of `about.html`, `privacy.html` and `404.html`, and `assets/icon.svg`. The PNG icons and `og-image.png` (the picture shown when a link is shared) are rendered from those, so redraw them if you change the colors.

## Adding items

Open `public/assets/items.js` and append to the right band:

```js
['🧃', 'A juice box', 'From a 10-pack', 0.45, 'approx.'],
```

Fields: emoji, a unique name, a detail line, the US price in dollars, and the price basis players see. Bands: 0 under $1, 1 $1–$20, 2 $20–$500, 3 $500–$20,000, 4 over $20,000. Each band cycles through all its items before repeating, and days people have already played keep their original items.

## How the results server works

- When a player finishes, the game sends the date, the day's five item names, their five guesses and an anonymous random ID from their browser. One result per ID per day is kept.
- The server works out the score itself from `items.js`, so a total can't be faked, and it rejects item names that aren't in the list.
- The game asks for that day's results and only compares players who priced the same five items.
- Until 100 real players have finished a day, labeled starter players fill in the comparison.
- Someone could still post made-up guesses that happen to be perfect. Rate limiting (Cloudflare has it built in) is the next step if that ever matters.
