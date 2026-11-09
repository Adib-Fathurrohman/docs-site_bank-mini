#!/usr/bin/env bash
# Points the documentation site's `current` back at an existing release. Run as root.
# Usage: rollback-docs.sh 0.2.0
set -euo pipefail
V="${1:?usage: $0 <version>}"; V="${V#v}"
DOCS=/var/www/rumput/bank-mini/docs
[ -d "$DOCS/releases/v$V" ] || { echo "No release v$V in $DOCS/releases:" >&2; ls "$DOCS/releases" >&2; exit 1; }
ln -sfn "releases/v$V" "$DOCS/current.new" && mv -Tf "$DOCS/current.new" "$DOCS/current"
echo "Active release: $(readlink "$DOCS/current")"
