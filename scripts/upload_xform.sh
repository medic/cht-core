#!/bin/bash -eu

SELF=$(basename $0)

USE_CONTEXT_FILE=false
FORCE=false
while getopts "c:f" opt; do
    case $opt in
        c) USE_CONTEXT_FILE=true ; CONTEXT_FILE="$OPTARG" ;;
        f) FORCE=true ;;
    esac
    shift $((OPTIND-1))
done

_usage () {
cat <<EOF

Usage:
  $SELF [options] <form id> <path to xform> [attachments ...]

Options:
  -f
      force-overwrite of existing doc
  -c <json-file>
      set the context(s) for which this form will be available

Examples:
  COUCH_URL=http://localhost:8000/medic $SELF registration /home/henry/forms/RegisterPregnancy.xml
EOF
}

if [[ $# < 2 ]]; then
    echo "[$SELF] Missing parameters."
    _usage
    exit 1
fi

if [[ -z "${COUCH_URL-}" ]]; then
    echo "[$SELF] ERROR: 'COUCH_URL' not set."
    _usage
    exit 1
fi

if ! curl "$COUCH_URL"; then
    echo "[$SELF] ERROR: Could not find server at $COUCH_URL.  Is CouchDB running?"
    exit 1
fi

ID="$1"
shift

XFORM_PATH="$1"
if ! [[ -f "$XFORM_PATH" ]]; then
    echo "[$SELF] ERROR: could not find xform at path: $XFORM_PATH"
    exit 1
fi
shift

DB="${COUCH_URL}"

echo "[$SELF] parsing XML to get form title and internal ID..."
# Yeah, it's ugly.  But we control the input.
formTitle="$(grep h:title $XFORM_PATH | sed -E -e 's_.*<h:title>(.*)</h:title>.*_\1_')"
formInternalId="$(sed -e '1,/<instance>/d' $XFORM_PATH | grep -E 'id="[^"]+"' | head -n1 | sed -E -e 's_.*id="([^"]+)".*_\1_')"

if $USE_CONTEXT_FILE; then
    formContext="$(cat "${CONTEXT_FILE}")"
else
    contextPatient=false
    contextPlace=false
    if grep -Fq '/context/person' $XFORM_PATH; then
        contextPatient=true
    fi
    if grep -Fq '/context/place' $XFORM_PATH; then
        contextPlace=true
    fi
    formContext='{ "person":'"$contextPatient"', "place":'"$contextPlace"' }'
fi

docUrl="${DB}/form:${ID}"

fullJson='{
    "type": "form",
    "title": "'"${formTitle}"'",
    "internalId": "'"${formInternalId}"'",
    "context": '"${formContext}"'
}'

cat <<EOF
[$SELF] -----
[$SELF] Summary
[$SELF]   reading from: $XFORM_PATH
[$SELF]   doc ID: form:$ID
[$SELF]   form title: $formTitle
[$SELF]   form internal ID: $formInternalId
[$SELF]   force override: $FORCE
[$SELF]   uploading to: $docUrl
[$SELF]   form context: $formContext
[$SELF]   full JSON: $fullJson
[$SELF] -----
EOF

if $FORCE && [[ "missing" != "$(curl -s ${docUrl} | jq -r .reason)" ]] ; then
    until [[ "deleted" = "$(curl -s ${docUrl} | jq -r .reason)" ]]; do
        echo "[$SELF] Trying to delete existing doc..."
        rev=$(curl -s "$docUrl" | jq -r ._rev)
        curl -s -X DELETE "${docUrl}?rev=${rev}" >/dev/null

        # wait until it's really deleted
        echo "[$SELF] waiting for doc deletion..."
        sleep 1
    done
fi

check_rev() {
    # exit if we don't see a rev property
    if [ -z "$rev" ] || [ "$rev" = "null" ]; then
        echo "[$SELF] Failed to create doc: $revResponse"
        exit 1
    fi
}

revResponse=$(curl -# -s -H "Content-Type: application/json" -X PUT -d "${fullJson}" "$docUrl")
rev=$(jq -r .rev <<< "$revResponse")
check_rev

# Upload a temp file with the title stripped
sed '/<h:title>/d' "$XFORM_PATH" > "$XFORM_PATH.$$.tmp"

echo "[$SELF] Uploading form: $ID..."
revResponse=$(curl -# -f -X PUT -H "Content-Type: text/xml" \
    --data-binary "@${XFORM_PATH}.$$.tmp" \
    "${docUrl}/xml?rev=${rev}")
rev=$(jq -r .rev <<< "$revResponse")

rm "$XFORM_PATH.$$.tmp"

while [ $# -gt 0 ]; do
    attachment="$1"
    shift
    echo "[$SELF] Uploading media attachment: $attachment..."
    revResponse=$(curl -# -f -X PUT -H "Content-Type: text/xml" \
            --data-binary "@${attachment}" \
            "${docUrl}/${attachment}?rev=${rev}")
    rev=$(jq -r .rev <<< "$revResponse")
    check_rev
done

echo "[$SELF] Form upload complete."
