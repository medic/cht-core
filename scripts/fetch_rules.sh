#!/bin/bash
command -v js-beautify >/dev/null 2>&1 || { echo >&2 "js-beautify not found. Run 'npm -g install js-beautify' first."; exit 1; }
COUCH_URL="${COUCH_URL-http://admin:pass@127.0.0.1:5984/medic}"
curl -s "${COUCH_URL}/_design/medic/_rewrite/app_settings/medic" | \
		jq -r '[.settings.tasks.rules] | .[0]' | \
		js-beautify --indent-size 2


