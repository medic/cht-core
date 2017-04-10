#!/bin/sh

# Upload the contents of a contact_summary js file to app_settings.
# Assumes the update_app_settings.sh script is in the same dir.

set -e
SELF=$(basename $0)
DIR=$(dirname $0)
COUCH_URL="${COUCH_URL-http://admin:pass@127.0.0.1:5984/medic}"
CONTACT_SUMMARY_FILE="$1"

_usage () {
    echo "Usage:"
    echo "  $SELF <contact_summary js file, human-readable format>"
}

if [ ! -f "$CONTACT_SUMMARY_FILE" ]
then
  echo "Cannot find rules file: '$CONTACT_SUMMARY_FILE'"
  echo
  _usage
  exit 1
fi

# Format for upload : remove all the spaces, place in json
NO_SPACES_FILE="$DIR/contact_summary.json.tmp"
printf '{ "contact_summary": "' > "$NO_SPACES_FILE"
sed -E -e 's_//.*$__' "$CONTACT_SUMMARY_FILE" | tr -d '\n' >> "$NO_SPACES_FILE"
printf '"}\n' >> "$NO_SPACES_FILE"

# Upload!
"$DIR/update_app_settings.sh" "$NO_SPACES_FILE"

# clean up
rm "$NO_SPACES_FILE"
