#!/bin/sh
# Puts your domain into every file that needs it.
# Run from the project folder:  sh tools/set-domain.sh yourdomain.com
set -e
[ -n "$1" ] || { echo "Usage: sh tools/set-domain.sh yourdomain.com"; exit 1; }
domain=$(printf '%s' "$1" | sed -e 's#^https\{0,1\}://##' -e 's#/.*$##')
cd "$(dirname "$0")/.."
files=$(grep -rl "YOUR-DOMAIN" public || true)
[ -n "$files" ] || { echo "No YOUR-DOMAIN placeholders left; the domain was already set."; exit 1; }
for f in $files; do
  sed -i.bak "s#YOUR-DOMAIN#$domain#g" "$f" && rm "$f.bak"
done
sed -i.bak "s#SITE_URL: ''#SITE_URL: 'https://$domain'#" public/assets/config.js && rm public/assets/config.js.bak
echo "Set $domain in the pages, robots.txt, sitemap.xml and config.js."
