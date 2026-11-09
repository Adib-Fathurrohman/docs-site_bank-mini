#!/usr/bin/env bash
# Builds the production artifact of the documentation site from the tracked files
# of HEAD: a static Astro build for https://docs-bank.rumput.tech, packed as
# dist-release/rumput-bank-mini-docs-v<version>.tar.gz with a .sha256 next to it.
# Usage: deploy/build-release.sh 0.2.1
set -euo pipefail

version="${1:?usage: $0 <version, e.g. 0.2.1>}"
root="$(git rev-parse --show-toplevel)"
cd "$root"

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    echo "Commit or stash your changes first: the artifact is built from HEAD." >&2
    exit 1
fi

name="rumput-bank-mini-docs-v${version}"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
git archive HEAD | tar -x -C "$work"
cd "$work"

npm ci --no-audit --no-fund --loglevel=error
SITE_URL=https://docs-bank.rumput.tech npm run build
npm run -s check:links
BACKEND_DIR="$root/../bank-mini-laravel" npm run -s check:api

# A static site only: nothing that looks like configuration, source or a secret.
bad=$(find dist \( -name '.*' -o -name '*.map' -o -name '*.php' -o -name '*.env' -o -name 'package.json' \) -print -quit)
[ -z "$bad" ] || { echo "Unexpected file in the build: $bad" >&2; exit 1; }

mkdir -p "$root/dist-release"
# COPYFILE_DISABLE: no macOS AppleDouble (._*) files in the archive.
COPYFILE_DISABLE=1 tar -czf "$root/dist-release/$name.tar.gz" -C dist --no-xattrs .
if tar -tzf "$root/dist-release/$name.tar.gz" | grep -qE '(^|/)\._'; then
    echo "AppleDouble files in the archive" >&2; exit 1
fi
cd "$root/dist-release"
shasum -a 256 "$name.tar.gz" > "$name.tar.gz.sha256"
cat "$name.tar.gz.sha256"
