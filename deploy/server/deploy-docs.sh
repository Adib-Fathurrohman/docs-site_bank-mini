#!/usr/bin/env bash
# Deploys a GitHub release of the Rumput Bank Mini documentation site. Run as root.
# Usage: deploy-docs.sh 0.2.1 [expected-sha256]
# Downloads the release, verifies its SHA-256, extracts it into a new release
# folder (never overwriting one), checks it and only then switches `current`.
# Nothing is restarted: nginx serves the files straight from `current`.
set -euo pipefail

V="${1:?usage: $0 <version, e.g. 0.2.1> [expected-sha256]}"; V="${V#v}"
EXPECTED="${2:-}"
APP=/var/www/rumput/bank-mini; DOCS=$APP/docs; REL=$DOCS/releases/v$V
NAME=rumput-bank-mini-docs-v$V
URL=https://github.com/Adib-Fathurrohman/docs-site_bank-mini/releases/download/v$V

[ ! -e "$REL" ] || { echo "Release v$V already exists: $REL" >&2; exit 1; }

DL=$APP/tmp/docs-download-v$V
rm -rf -- "$DL"
install -d -o rumput -g rumput -m 700 "$DL"
curl -fsSL -o "$DL/$NAME.tar.gz" "$URL/$NAME.tar.gz"
curl -fsSL -o "$DL/$NAME.tar.gz.sha256" "$URL/$NAME.tar.gz.sha256"
(cd "$DL" && sha256sum -c "$NAME.tar.gz.sha256")
if [ -n "$EXPECTED" ]; then
  actual=$(sha256sum "$DL/$NAME.tar.gz" | cut -d' ' -f1)
  [ "$actual" = "$EXPECTED" ] || { echo "SHA-256 $actual does not match the recorded $EXPECTED" >&2; exit 1; }
  echo "Matches the recorded SHA-256."
fi

install -d -o rumput -g rumput -m 755 "$DOCS" "$DOCS/releases"

created=0
cleanup() { [ "$created" = 1 ] && rm -rf -- "$REL"; }
trap 'echo "FAILED: removing the incomplete release; the active release is unchanged." >&2; cleanup' ERR

install -d -o rumput -g rumput -m 755 "$REL"; created=1
tar -xzf "$DL/$NAME.tar.gz" -C "$REL" --no-same-owner --no-same-permissions
chown -R rumput:rumput "$REL"
find "$REL" -type d -exec chmod 755 {} +; find "$REL" -type f -exec chmod 644 {} +

# A static build only: the pages, the search index, nothing that looks like source or configuration.
[ -f "$REL/index.html" ] && [ -f "$REL/404.html" ] && [ -d "$REL/_astro" ] && [ -d "$REL/pagefind" ] \
  || { echo "index.html, 404.html, _astro/ or pagefind/ missing" >&2; false; }
bad=$(find "$REL" \( -name '.*' -o -name '*.map' -o -name '*.php' -o -name '*.env' -o -name 'package.json' \) -print -quit)
[ -z "$bad" ] || { echo "Unexpected file in the release: $bad" >&2; false; }
grep -qs 'https://docs-bank.rumput.tech/' "$REL/sitemap-0.xml" || { echo "The build was not made for https://docs-bank.rumput.tech" >&2; false; }

trap - ERR
ln -sfn "releases/v$V" "$DOCS/current.new" && mv -Tf "$DOCS/current.new" "$DOCS/current"
rm -rf -- "$DL"
echo "Active release: $(readlink "$DOCS/current")"
echo "Old releases are kept in $DOCS/releases (rollback: $APP/bin/rollback-docs.sh <version>)."
