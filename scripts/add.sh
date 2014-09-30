#!/bin/sh

SELF=$(basename $0)

SITE="$1"
AUTH="admin"
DB='medic'
MSG='foo bar baz'
FROM='+25477777777'

# 2 seconds ago in ms
# might be useful for date calculation later
TIMESTAMP=$(($(($(date +%s) - 2)) * 1000))

function _exit_fail {
    CODE="$1"
    echo "command failed with exit code $CODE."
    exit $CODE
}

function _usage {
    echo ""
    echo "Post a message to Medic Mobile"
    echo ""
    echo "Usage: $SELF <base url> <auth> <message> <from> <timestamp>"
    echo ""
    echo "Examples: "
    echo " $SELF http://localhost:8000 # assumes username admin and prompts for password"
    echo " $SELF http://localhost:8000 'admin:123qwe!$'"
    echo " $SELF http://localhost:8000 'admin:123qwe!$' 'Hi Charlie' +15159999999 'Aug 4, 2014 22:00 -0500'"
    exit
}

if [ -z "$SITE" ]; then
    _usage
    exit
fi

if [ -n "$2" ]; then
    AUTH="$2"
fi

if [ -n "$3" ]; then
    MSG="$3"
fi

if [ -n "$4" ]; then
    FROM="$4"
fi

if [ -n "$5" ]; then
    TIMESTAMP="$5"
fi

function _curl {
    curl -k -u "$AUTH" \
        --data-urlencode "message=$MSG" \
        --data-urlencode "from=$FROM" \
        --data-urlencode "sent_timestamp=$TIMESTAMP" \
        -X POST "${SITE}/${DB}/_design/medic/_rewrite/add"
    RET=$?
    if [ $RET -ne 0 ]; then
        _exit_fail "$RET"
    fi
}

_curl

