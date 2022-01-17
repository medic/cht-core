#!/bin/bash

set -e
WAIT_THRESHOLD="${WAIT_THRESHOLD:-20}"
SLEEP_SECONDS="${SLEEP_SECONDS:-3}"


get_couchdb_url()
{
  echo "http://$COUCHDB_USER:$COUCHDB_PASSWORD@$COUCHDB_SERVICE_NAME:$COUCHDB_PORT"
}


wait_for_couchdb()
{
  local  wait_count=0
  while [ "$WAIT_THRESHOLD" -gt $wait_count ]; do
    wait_count=$((wait_count +1))
    curl "`get_couchdb_url`" &>/dev/null
    [ "$?" -eq 0 ] && return 0
    sleep $SLEEP_SECONDS
    echo 'Waiting for couchdb'>&2
  done

  return 1
}


create_couchdb_admin()
{
  local user="$1"
  local url="`get_couchdb_url`"

  # generate password and create user
  local passwd=$(< /dev/urandom tr -dc _A-Z-a-z-0-9 | head -c${4:-32};)
  curl -X PUT $url/_node/couchdb@$COUCH_NODE_NAME/_config/admins/$user -d '"'"$passwd"'"'
  mkdir -p /srv/storage/$user/passwd
  echo "$passwd" > /srv/storage/$user/passwd/$user

  # Create user document for administrator
  local id="org.couchdb.user:$user" &&
  \
  local doc="{
    \"id\": \"$id\", \"roles\": [],
    \"type\": \"user\", \"name\": \"$user\"
  }" &&
  \
  create_couchdb_put 't' \
    | curl -K- -sfX PUT -H 'Content-Type: application/json' \
        --data-binary "$doc" "$url/_users/$id" >/dev/null

  if [ ${PIPESTATUS[1]} -ne 0 ]; then
    return 126
  fi

  return 0
}