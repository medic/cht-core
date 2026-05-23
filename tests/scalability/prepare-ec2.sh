#!/bin/bash
set -e

shutdown -P +60
mkdir -p /cht/upgrade-service  /cht/compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh ./get-docker.sh
BUILD="https://staging.dev.medicmobile.org/_couch/builds_4/medic:medic:5.1.0"
curl -s https://raw.githubusercontent.com/medic/cht-upgrade-service/main/docker-compose.yml \
  -o /cht/upgrade-service/docker-compose.yml
curl -s "$BUILD"/docker-compose/cht-core.yml -o /cht/compose/cht-core.yml
curl -s "$BUILD"/docker-compose/cht-couchdb.yml -o /cht/compose/cht-couchdb.yml

cd /cht/upgrade-service/
cat > /cht/upgrade-service//.env << EOF
DOCKER_CONFIG_PATH=/home/.docker
CHT_COMPOSE_PATH=/cht/compose
COUCHDB_PASSWORD=medicScalability
EOF
docker compose up -d
