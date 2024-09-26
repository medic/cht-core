#!/bin/bash -eu

set -e

docker compose -f ./api/tests/integration/compose.yml up -d
echo "Starting CouchDB"

until nc -z localhost 5984; do sleep 1; done
sleep 2
echo "CouchDB Started"
