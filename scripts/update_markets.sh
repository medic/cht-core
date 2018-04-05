#!/usr/bin/env bash

set -o pipefail

SELF="`basename $0`"
SELF_HOME="`dirname $0`"
COUCH_URL="$1"
CHANNEL=${2-release}
TMPDIR=${TMPDIR-/tmp/medic-servers-data}

_exit_fail () {
    echo "exiting: $1" 1>&2
    exit 1
}

_warn () {
    echo "warning: $1" 1>&2
}

_get_doc () {
  local db=$1
  local uuid=$2
  if [ -z "$db" ]; then
      echo "please define db parameter"
      return 1
  fi
  if [ -z "$uuid" ]; then
      echo "please define uuid parameter"
      return 1
  fi
  curl -k -s -S -f "$COUCH_URL/$db/$uuid"
}

_put_doc () {
  local db=$1
  local uuid=$2
  if [ -z "$db" ]; then
      echo "please define db parameter"
      return 1
  fi
  if [ -z "$uuid" ]; then
      echo "please define uuid parameter"
      return 1
  fi
  curl -k -s -S -f -X PUT -d @- "$COUCH_URL/$db/$uuid"
}

_usage () {
cat <<EOT

Usage: $SELF url [release channel]

Description: 

  Updates Garden20 Dashboard market docs to change the market the currently
  installed apps are subscribed to.  Requires a url parameter and optionally
  specify release channel.  Default is 'release'.

  Available release channels:

    release
    release_v2
    release_v214
    rc
    beta
    alpha

  Examples:
    $SELF 'http://admin:secrets!\$@192.168.21.201' # quote special characters

EOT
}

if [ -z "$COUCH_URL" ]; then
    _usage
    _exit_fail "Please provide the url parameter."
fi

if [ ! -d "$TMPDIR" ]; then
    mkdir "$TMPDIR" || _exit_fail "Failed to create temp dir."
fi

_to_ssl () {
    local file=$1
    sed -i.bak 's/http:\/\/staging.dev.medicmobile.org/https:\/\/staging.dev.medicmobile.org/g' \
        "$file"
}

_to_release_market () {
    local file=$1
    sed -i.bak 's/market_1\/_db/market\/_db/g' "$file" && \
    sed -i.bak 's/market_2\/_db/market\/_db/g' "$file" && \
    sed -i.bak 's/market_3\/_db/market\/_db/g' "$file" && \
    sed -i.bak 's/market_4\/_db/market\/_db/g' "$file" && \
    sed -i.bak 's/market_5\/_db/market\/_db/g' "$file" && \
    sed -i.bak 's/markets-rc/markets-release/g' "$file" && \
    sed -i.bak 's/markets-beta/markets-release/g' "$file" && \
    sed -i.bak 's/markets-alpha/markets-release/g' "$file" && \
    sed -i.bak 's/markets-release-v214/markets-release/g' "$file" && \
    sed -i.bak 's/markets-release-v2/markets-release/g' "$file" 
}

_to_release_v2_market () {
    local file=$1
    sed -i.bak 's/market\/_db/market_5\/_db/g' "$file" && \
    sed -i.bak 's/market_1\/_db/market_5\/_db/g' "$file" && \
    sed -i.bak 's/market_2\/_db/market_5\/_db/g' "$file" && \
    sed -i.bak 's/market_3\/_db/market_5\/_db/g' "$file" && \
    sed -i.bak 's/market_4\/_db/market_5\/_db/g' "$file" && \
    sed -i.bak 's/markets-release/markets-release-v2/g' "$file" && \
    sed -i.bak 's/markets-rc/markets-release-v2/g' "$file" && \
    sed -i.bak 's/markets-beta/markets-release-v2/g' "$file" && \
    sed -i.bak 's/markets-alpha/markets-release-v2/g' "$file" && \
    sed -i.bak 's/markets-release-v214/markets-release-v2/g' "$file" 
}

_to_rc_market () {
    local file=$1
    sed -i.bak 's/market\/_db/market_3\/_db/g' "$file" && \
    sed -i.bak 's/market_1\/_db/market_3\/_db/g' "$file" && \
    sed -i.bak 's/market_2\/_db/market_3\/_db/g' "$file" && \
    sed -i.bak 's/market_4\/_db/market_3\/_db/g' "$file" && \
    sed -i.bak 's/market_5\/_db/market_3\/_db/g' "$file" && \
    sed -i.bak 's/markets-release\//markets-rc\//g' "$file" && \
    sed -i.bak 's/markets-release-v2\//markets-rc\//g' "$file" && \
    sed -i.bak 's/markets-beta/markets-rc/g' "$file" && \
    sed -i.bak 's/markets-alpha/markets-rc/g' "$file" && \
    sed -i.bak 's/markets-release-v214/markets-rc/g' "$file" 
}

_to_release_v214_market () {
    local file=$1
    sed -i.bak 's/market\/_db/market_4\/_db/g' "$file" && \
    sed -i.bak 's/market_1\/_db/market_4\/_db/g' "$file" && \
    sed -i.bak 's/market_2\/_db/market_4\/_db/g' "$file" && \
    sed -i.bak 's/market_3\/_db/market_4\/_db/g' "$file" && \
    sed -i.bak 's/market_5\/_db/market_4\/_db/g' "$file" && \
    sed -i.bak 's/markets-release\//markets-release-v214\//g' "$file" && \
    sed -i.bak 's/markets-release-v2\//markets-release-v214\//g' "$file" && \
    sed -i.bak 's/markets-beta/markets-release-v214/g' "$file" && \
    sed -i.bak 's/markets-alpha/markets-release-v214/g' "$file" && \
    sed -i.bak 's/markets-rc/markets-release-v214/g' "$file" 
}

_to_beta_market () {
    local file=$1
    sed -i.bak 's/market\/_db/market_1\/_db/g' "$file" && \
    sed -i.bak 's/market_2\/_db/market_1\/_db/g' "$file" && \
    sed -i.bak 's/market_3\/_db/market_1\/_db/g' "$file" && \
    sed -i.bak 's/market_4\/_db/market_1\/_db/g' "$file" && \
    sed -i.bak 's/market_5\/_db/market_1\/_db/g' "$file" && \
    sed -i.bak 's/markets-release\//markets-beta\//g' "$file" && \
    sed -i.bak 's/markets-release-v2\//markets-beta\//g' "$file" && \
    sed -i.bak 's/markets-rc/markets-beta/g' "$file" && \
    sed -i.bak 's/markets-alpha/markets-beta/g' "$file" && \
    sed -i.bak 's/markets-release-v214/markets-beta/g' "$file" 
}

_to_alpha_market () {
    local file=$1
    sed -i.bak 's/market\/_db/market_2\/_db/g' "$file" && \
    sed -i.bak 's/market_1\/_db/market_2\/_db/g' "$file" && \
    sed -i.bak 's/market_3\/_db/market_2\/_db/g' "$file" && \
    sed -i.bak 's/market_4\/_db/market_2\/_db/g' "$file" && \
    sed -i.bak 's/market_5\/_db/market_2\/_db/g' "$file" && \
    sed -i.bak 's/markets-release\//markets-alpha\//g' "$file" && \
    sed -i.bak 's/markets-release-v2\//markets-alpha\//g' "$file" && \
    sed -i.bak 's/markets-rc/markets-alpha/g' "$file" && \
    sed -i.bak 's/markets-beta/markets-alpha/g' "$file" && \
    sed -i.bak 's/markets-release-v214/markets-alpha/g' "$file" 
}

curl -k -s -S -f "$COUCH_URL/dashboard/_design/dashboard/_view/get_markets" > \
    "$TMPDIR/markets.json" && \
    grep '"id":' "$TMPDIR/markets.json" > "$TMPDIR/market_docs.json" && \
    sed -i.bak 's/.*id":"\(.*\)","key.*/\1/g' "$TMPDIR/market_docs.json" || \
    exit 1

for uuid in `cat "$TMPDIR/market_docs.json"`; do
    _get_doc dashboard $uuid > "${TMPDIR}/${uuid}.json"
    _to_ssl "${TMPDIR}/${uuid}.json" && \
    _to_${CHANNEL}_market "${TMPDIR}/${uuid}.json" && \
    cat "${TMPDIR}/${uuid}.json" | _put_doc dashboard $uuid
done

echo "migration complete."
exit 0
