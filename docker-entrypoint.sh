#!/bin/bash

# #Start nginx
nginx -c /opt/docker-nginx.conf
echo "*** Started reverse proxy through nginx ***"

echo "*** executing $@ ***"
exec "$@"