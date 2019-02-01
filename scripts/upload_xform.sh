#!/bin/bash -eu

SELF=$(basename $0)

USE_CONTEXT_FILE=false
USE_META_FILE=false
FORCE=false
DRY_RUN=false
while getopts "c:m:df" opt; do
    case $opt in
        c) USE_CONTEXT_FILE=true ; CONTEXT_FILE="$OPTARG" ;;
        m) USE_META_FILE=true ; META_FILE="$OPTARG" ;;
        f) FORCE=true ;;
        d) DRY_RUN=true ;;
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
  -m <json-file>
      set the metadata for the form including context and icon. overrides -c option.
  -d
      dry run: process the files and display result to output but don't perform the upload

Examples:
  COUCH_URL=http://localhost:8000/medic $SELF registration /home/henry/forms/RegisterPregnancy.xml
EOF
}

error() {
    echo "[$0] Error: $1"; exit 1
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

if [[ "$formInternalId" != "$ID" ]]; then
  echo "[$SELF] WARNING: ID supplied on CLI and ID in form XML are different."
  echo "[$SELF] WARNING  |  This may not be allowed in future - see: https://github.com/medic/medic/issues/3342"
  echo "[$SELF] WARNING  |  If this is a new project, please make IDs match."
  echo "[$SELF] WARNING  |  id on CLI: $ID"
  echo "[$SELF] WARNING  |  id in XML: $formInternalId"
fi

lowercaseId="$(tr '[:upper:]' '[:lower:]' <<< "$formInternalId")"
if [[ "$formInternalId" != "$lowercaseId" ]]; then
  echo "[$SELF] WARNING ID specified in form XML contains upper-case characters."
  echo "[$SELF] WARNING  |  This may not be allowed in future: https://github.com/medic/medic/issues/3342"
  echo "[$SELF] WARNING  |  If this is a new project, please change the XML ID lower-case."
fi

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

fullJson='{
    "type": "form",
    "title": "'"${formTitle}"'",
    "internalId": "'"${formInternalId}"'",
    "context": '"${formContext}"'
}'

if $USE_META_FILE; then
    meta="$(cat "${META_FILE}")"
    fullJson="$(echo $fullJson | jq '. * '"$meta"'')"
fi

docUrl="${DB}/form:${ID}"

cat <<EOF
[$SELF] -----
[$SELF] Summary
[$SELF]   reading from: $XFORM_PATH
[$SELF]   doc ID: form:$ID
[$SELF]   form title: $formTitle
[$SELF]   form internal ID: $formInternalId
[$SELF]   force override: $FORCE
[$SELF]   uploading to: $docUrl
[$SELF]   full JSON: $fullJson
[$SELF] -----
EOF

if $DRY_RUN; then
    echo "[$SELF] DRY RUN COMPLETE: Execute without -d to upload the form"
    exit 0;
fi

check_rev() {
    # exit if we don't see a rev property
    if [ -z "$rev" ] || [ "$rev" = "null" ]; then
        echo "[$SELF] Failed to create doc: $revResponse"
        exit 1
    fi
}

rev=""
if $FORCE; then
    revResponse="$(curl -s ${docUrl})"
    if [[ "not_found" != "$(jq -r .error <<< "$revResponse")" ]]; then
      rev=$(jq -r ._rev <<< "$revResponse")
      check_rev
    fi
fi

if [ -z "${rev-}" ]; then
  revResponse=$(curl -# -s -H "Content-Type: application/json" -X PUT -d "${fullJson}" "$docUrl")
else
  revResponse=$(curl -# -s -H "Content-Type: application/json" -X PUT -d "${fullJson}" "$docUrl?rev=${rev-}")
fi
echo "[$0] Upload response: $revResponse"
rev=$(jq -r .rev <<< "$revResponse")
check_rev

echo "[$SELF] Uploading form xml: id: $ID, rev: $rev..."
revResponse=$(curl -# -f -X PUT -H "Content-Type: text/xml" \
    --data-binary "@${XFORM_PATH}" \
    "${docUrl}/xml?rev=${rev}")
echo "revResponse: $revResponse"
rev=$(jq -r .rev <<< "$revResponse")

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
