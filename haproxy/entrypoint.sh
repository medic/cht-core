#!/bin/bash

set -e

DEFAULT="/usr/local/etc/haproxy/default_frontend.cfg"
BACKEND="/usr/local/etc/haproxy/backend.cfg"

# Update backend servers
cp /usr/local/etc/haproxy/backend.cfg.template $BACKEND
for COUCHDB_SERVER in ${COUCHDB_SERVERS//,/ }
do
  echo "  server $COUCHDB_SERVER $COUCHDB_SERVER:5984 check inter 5s" >> $BACKEND
done

# Place environment variables into config
envsubst < $DEFAULT
envsubst < $BACKEND

# Start haproxy
exec /usr/local/bin/docker-entrypoint.sh -f $DEFAULT -f $BACKEND

