#!/bin/bash

set -e

DEFAULT="/usr/local/etc/haproxy/default_frontend.cfg"
BACKEND="/usr/local/etc/haproxy/backend.cfg"

# Update backend servers
cp /usr/local/etc/haproxy/backend.cfg.template $BACKEND
for COUCHDB_SERVER in ${COUCHDB_SERVERS//,/ }
do
  printf "  server $COUCHDB_SERVER $COUCHDB_SERVER:5984 check agent-check agent-inter 5s agent-addr $HEALTHCHECK_ADDR agent-port 5555\n" >> $BACKEND
done

# Place environment variables into config
envsubst < $DEFAULT
envsubst < $BACKEND

#Write pw for healthcheck subshell to work
mkdir -p /srv/storage/haproxy/passwd
echo $COUCHDB_USER > /srv/storage/haproxy/passwd/username
echo $COUCHDB_PASSWORD > /srv/storage/haproxy/passwd/admin

# Start haproxy
exec /usr/local/bin/docker-entrypoint.sh -f $DEFAULT -f $BACKEND
