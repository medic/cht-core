#!/bin/sh

SELF=$(basename $0)

ID="$1"
shift
XFORM_PATH="$1"
shift
DB="${COUCH_URL-http://127.0.0.1:5984/medic}"

_usage () {
    echo ""
    echo "Usage:"
    echo "  $SELF <form id> <path to xform> [attachments ...]"
    echo ""
    echo "Examples: "
    echo "  COUCH_URL=http://localhost:8000/medic $SELF registration /home/henry/forms/RegisterPregnancy.xml"
}

if [ -z "$ID" ]; then
    echo "Missing ID parameter."
    _usage
    exit 1 
fi

if [ ! -f "$XFORM_PATH" ]; then
    echo "Can't find XFORM_PATH"
    _usage
    exit 1
fi

check_rev() {
    # exit if we don't see a rev property
    if [ -z "$rev" ] || [ "$rev" = "null" ]; then
        echo "Failed to create doc: $revResponse"
        exit 1
    fi
}

revResponse=$(curl -s -H "Content-Type: application/json" -X PUT -d '{"type":"form"}' "$DB/form:${ID}")
rev=$(jq -r .rev <<< "$revResponse")
check_rev

echo "[$SELF] Uploading form: $ID..."
revResponse=$(curl -f -X PUT -H "Content-Type: text/xml" \
    --data-binary "@${XFORM_PATH}" \
    "${DB}/form:${ID}/xml?rev=${rev}")
rev=$(jq -r .rev <<< "$revResponse")

while [ $# -gt 0 ]; do
    attachment="$1"
    shift
    echo "[$SELF] Uploading media attachment: $attachment..."
    revResponse=$(curl -f -X PUT -H "Content-Type: text/xml" \
            --data-binary "@${attachment}" \
            "${DB}/form:${ID}/${attachment}?rev=${rev}")
    rev=$(jq -r .rev <<< "$revResponse")
    check_rev
done

echo "[$SELF] Form upload complete."
