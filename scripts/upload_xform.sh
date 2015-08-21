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

echo "[$SELF] parsing XML to get form title and internal ID..."
# Yeah, it's ugly.  But we control the input.
formTitle="$(grep h:title $XFORM_PATH | sed -E -e 's_.*<h:title>(.*)</h:title>.*_\1_')"
formInternalId="$(grep -E 'id="[^"]+"' $XFORM_PATH | head -n1 | sed -E -e 's_.*id="([^"]+)".*_\1_')"

cat <<EOF
[$SELF] -----
[$SELF] Summary
[$SELF]   reading from: $XFORM_PATH
[$SELF]   doc ID: form:$ID
[$SELF]   form title: $formTitle
[$SELF]   form internal ID: $formInternalId
[$SELF] -----
EOF

check_rev() {
    # exit if we don't see a rev property
    if [ -z "$rev" ] || [ "$rev" = "null" ]; then
        echo "Failed to create doc: $revResponse"
        exit 1
    fi
}

revResponse=$(curl -# -s -H "Content-Type: application/json" -X PUT -d '{
    "type":"form",
    "title":"'"${formTitle}"'",
    "internalId":"'"${formInternalId}"'"
}' "$DB/form:${ID}")
rev=$(jq -r .rev <<< "$revResponse")
check_rev

echo "[$SELF] Uploading form: $ID..."
revResponse=$(curl -# -f -X PUT -H "Content-Type: text/xml" \
    --data-binary "@${XFORM_PATH}" \
    "${DB}/form:${ID}/xml?rev=${rev}")
rev=$(jq -r .rev <<< "$revResponse")

while [ $# -gt 0 ]; do
    attachment="$1"
    shift
    echo "[$SELF] Uploading media attachment: $attachment..."
    revResponse=$(curl -# -f -X PUT -H "Content-Type: text/xml" \
            --data-binary "@${attachment}" \
            "${DB}/form:${ID}/${attachment}?rev=${rev}")
    rev=$(jq -r .rev <<< "$revResponse")
    check_rev
done

echo "[$SELF] Form upload complete."
