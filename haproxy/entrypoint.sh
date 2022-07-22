#!/bin/sh

# Make sure service is running
service rsyslog start

# Place environment variables into config
envsubst < /usr/local/etc/haproxy/haproxy.cfg

#Write pw for healthcheck subshell to work
mkdir -p /srv/storage/haproxy/passwd
echo $COUCHDB_USER > /srv/storage/haproxy/passwd/username
echo $COUCHDB_PASSWORD > /srv/storage/haproxy/passwd/admin

# Start haproxy
exec /docker-entrypoint.sh "$@"
