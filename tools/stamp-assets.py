#!/usr/bin/env python3
"""Stamps a version onto the script and style links in the pages, e.g. assets/app.js?v=3f9a1c2b.

Why: Cloudflare and browsers keep files in /assets for hours. Without a version in the address, players keep
getting an old app.js or styles.css after an update. The version is a fingerprint of the file's contents, so
the address changes only when the file does.

Run after changing anything in public/assets and before committing:
    python3 tools/stamp-assets.py
"""
import hashlib, pathlib, re

PUBLIC = pathlib.Path(__file__).resolve().parent.parent / 'public'
FILES = ['config.js', 'items.js', 'app.js', 'styles.css']
stamp = {f: hashlib.sha256((PUBLIC / 'assets' / f).read_bytes()).hexdigest()[:8] for f in FILES}
link = re.compile(r'(assets/(' + '|'.join(re.escape(f) for f in FILES) + r'))(\?v=[0-9a-f]+)?(?=")')

changed = []
for page in sorted(PUBLIC.glob('*.html')):
    before = page.read_text()
    after = link.sub(lambda m: f'{m.group(1)}?v={stamp[m.group(2)]}', before)
    if after != before:
        page.write_text(after)
        changed.append(page.name)
print('updated: ' + ', '.join(changed) if changed else 'pages already up to date')
