#!/bin/bash

info()
{
    echo "Info: $*"
}

wait_for_api()
{
    # Can't seem to import the waitForApi from server.js. Essentially, we need to do the same thing: 
    # Migrations could take days, and there is no way to know what API is doing

  until nc -z $API_SVC_NAME 5988; do sleep 10 && info "Waiting for API to be Ready..."; done
  return 1
}

wait_for_api
node /sentinel/server.js