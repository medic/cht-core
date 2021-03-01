#!/bin/bash

MY_DIR=$(dirname $(readlink -f $0))
$MY_DIR/docker-entrypoint.common.sh

node /app/api/server.helper.js
