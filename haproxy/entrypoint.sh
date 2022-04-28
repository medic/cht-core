#!/bin/sh

# Make sure service is running
service rsyslog start

# Make sure logging dir exists
mkdir -p /srv/storage/audit

# Touch the log file so we can tail on it
touch /srv/storage/audit/haproxy.log

# Throw the log to output
tail -f /srv/storage/audit/haproxy.log &

# Place environment variables into config
envsubst < /usr/local/etc/haproxy/haproxy.cfg

# Start haproxy
exec /docker-entrypoint.sh "$@"
