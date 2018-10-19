#!/bin/bash
# #Start nginx

nginx -c /opt/docker-nginx.conf
exec "$@"
