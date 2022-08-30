#!/bin/bash

set -e
# Make sure service is running
service rsyslog start

# Place environment variables into config
CONFIG="/usr/local/etc/haproxy/haproxy.cfg"
# Update backend servers
sed -i '/server .*:5984/d' $CONFIG
for COUCHDB_SERVER in ${COUCHDB_SERVERS//,/ }
do
  printf "  server $COUCHDB_SERVER $COUCHDB_SERVER:5984 check inter 2s\n" >> $CONFIG
done
envsubst < $CONFIG

#Write pw for healthcheck subshell to work
mkdir -p /srv/storage/haproxy/passwd
echo $COUCHDB_USER > /srv/storage/haproxy/passwd/username
echo $COUCHDB_PASSWORD > /srv/storage/haproxy/passwd/admin

# Start haproxy
exec /docker-entrypoint.sh "$@"
