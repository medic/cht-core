#!/bin/bash
set -e
WAIT_THRESHOLD="${WAIT_THRESHOLD:-20}"
SLEEP_SECONDS="${SLEEP_SECONDS:-3}"

info()
{
    echo "Info: $*"
}

warn()
{
    echo "Warning: $*"
}

fatal()
{
    echo "Fatal: $*"
}

welcome_message(){
  info 'Starting CHT API'
}

main(){
  welcome_message
  export COUCH_URL=http://$COUCHDB_USER:$COUCHDB_PASSWORD@$COUCHDB_SERVICE_NAME:$COUCHDB_PORT/medic

  node /api/server.js
}

"$@"