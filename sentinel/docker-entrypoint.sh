#!/bin/bash

wait_for_api()
{
    node -p "require('./server.js').waitForApi()"
}

is_setup_needed()
{
  ! is_existing_user 'medic-sentinel'
}

is_existing_user()
{
  local user="$1"
  shift 1

  local userdoc=$(curl -X GET http://$user:$(cat /srv/storage/$user/passwd/$user)@$COUCHDB_SERVICE_NAME:5985/_users/org.couchdb.user:$user | jq '._id?')

  if [ "$userdoc" = \"org.couchdb.user:$user\" ]; then
    return 0
  else
    return 1
  fi
}

#now create service user and start sentinel

create_couchdb_put()
{
  local should_auth="$1"
  local payload="$2"
  local payload_is_file="$3"

  local cmd='cat'

  if [ -z "$payload_is_file" ]; then
    cmd='echo'
  fi

  # Send JSON-encoded string payload if provided
  if [ "$#" -gt 1 ]; then
    echo -n 'data = "\"' &&
    "$cmd" "$payload" &&
    echo '\""'
  fi
}

create_couchdb_admin()
{
  local user="$1"
#  local passwd="$2"
  shift 2

  # generate password and create user
  local passwd=$(< /dev/urandom tr -dc _A-Z-a-z-0-9 | head -c${1:-32};echo;)
  curl -X PUT http://$COUCHDB_USER:$COUCHDB_PASSWORD@$COUCHDB_SERVICE_NAME:5985/_node/couchdb@127.0.0.1/_config/admins/$user -d '"$passwd"'
  mkdir -p /srv/storage/$user/passwd
  echo "$passwd" > /srv/storage/$user/passwd/$user

  # Create user document for administrator
  local url="`get_couchdb_url`" &&
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

postinstall()
{

  info 'Creating CouchDB service accounts'
  create_couchdb_admin 'medic-sentinel'

  if [ "$?" -ne 0 ]; then
    fatal "Failed to create one or more service accounts"
  fi

  if [ "$?" -ne 0 ]; then
    fatal "Failed to create interactive admin account"
  fi

  info 'New CouchDB Administrative User: medic-sentinel'

  info 'Medic-Sentinel first run setup successful'
}

if is_setup_needed; then
    info 'Setting up Medic-Sentinel..'
    postinstall "$@"
fi

wait_for_api
export COUCH_URL=http://medic-sentinel:$(cat /srv/storage/medic-sentinel/passwd/medic-sentinel)@$HAPROXY_SVC:5984/medic
node /app/sentinel/server.js