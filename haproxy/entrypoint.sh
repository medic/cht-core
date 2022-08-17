#!/bin/bash

set -e
# Make sure service is running
service rsyslog start

# Place environment variables into config
CONFIG="/usr/local/etc/haproxy/haproxy.cfg"
for COUCHDB_SERVER in ${COUCHDB_SERVERS//,/ }
do
  printf "  server $COUCHDB_SERVER $COUCHDB_SERVER:5984 check agent-check agent-inter 5s agent-addr healthcheck agent-port 5555\n" >> $CONFIG
done
envsubst < $CONFIG

#Write pw for healthcheck subshell to work
mkdir -p /srv/storage/haproxy/passwd
echo $COUCHDB_USER > /srv/storage/haproxy/passwd/username
echo $COUCHDB_PASSWORD > /srv/storage/haproxy/passwd/admin

# Start haproxy
exec /docker-entrypoint.sh "$@"
