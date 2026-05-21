#!/usr/bin/env bash
set -euo pipefail
compgen -G "tests/logs/*.log" > /dev/null || exit 0
tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT
# Strip CouchDB OS-Process debug dumps which legitimately log user-creation doc bodies (with passwords).
# Also strip CouchDB update_seq strings which legitimately look like Vercel app refresh tokens.
for f in tests/logs/*.log; do
  grep -Ev "OS Process #?Port|OS Process .* Input ::" "$f" | sed -E 's/ seq [0-9]+-[A-Za-z0-9_-]+/ seq [REDACTED]/g' > "$tmpdir/$(basename "$f")"
done
exec ./node_modules/.bin/secretlint --secretlintrc scripts/ci/.secretlintrc.json "$tmpdir"/*.log
