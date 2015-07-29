#!/bin/sh

SELF=$(basename $0)

ID="$1"
XFORM_PATH="$2"
DB="${COUCH_URL-http://127.0.0.1:5984/medic}"

_usage () {
    echo ""
    echo "Add a form to the system"
    echo ""
    echo "Usage: $SELF <form id> <path to xform>"
    echo ""
    echo "Examples: "
    echo ""
    echo "COUCH_URL=http://localhost:8000/medic $SELF registration /home/henry/forms/RegisterPregnancy.xml"
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

# create new doc
revResponse=$(curl -s -H "Content-Type: application/json" -X PUT -d '{"type":"form"}' "$DB/form:${ID}")
rev=$(jq -r .rev <<< "$revResponse")

# exit if we don't see a rev property
if [ -z "$rev" ] || [ "$rev" = "null" ]; then
    echo "Failed to create doc: $revResponse"
    exit 1
fi

curl -f -X PUT -H "Content-Type: text/xml" \
    --data-binary "@${XFORM_PATH}" \
    "${DB}/form:${ID}/xml?rev=${rev}"

