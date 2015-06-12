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
    exit
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
rev=`curl -H "Content-Type: application/json" -X PUT -d '{"type":"form"}' "$DB/${ID}"`

# exit if we don't see a rev property
echo "$rev" | grep '"rev"' > /dev/null
if [ $? != 0 ]; then
    echo "Failed to create doc: $rev"
    exit 1
fi

rev=`echo "$rev" | sed 's/.*rev":"//' | sed 's/".*//g' | tr -d '\n' | tr -d '\r'`

curl -f -X PUT -H "Content-Type: text/xml" \
    --data-binary "@${XFORM_PATH}" \
    "${DB}/${ID}/xml?rev=${rev}"

