#!/bin/bash

apt-get update
apt-get install -y curl -q
echo Installing Node
echo "https://deb.nodesource.com/setup_$NODE_VERSION"
curl -sL "https://deb.nodesource.com/setup_$NODE_VERSION" | bash -
apt-get install -y nodejs
echo Node install finished
node -v
apt-get install -y xsltproc
# Create couchdb system tables (this has to be done manually on couchdb 2.0)
curl -X PUT "$COUCH/{_users,_replicator,_global_changes,_metadata,admins,medic-test}"

echo '[medic] creating admin'
curl -X PUT "$COUCH/_node/_local/_config/admins/admin" -d '"pass"'

echo '[medic] creating admin user'
curl -X POST "$COUCH/_users" -H "Content-Type: application/json" -d '{"_id": "org.couchdb.user:admin", "name": "admin", "password":"pass", "type":"user", "roles":[]}'

echo '[medic] setting require_valid_user'
curl -X PUT --data '"true"' "$COUCH/_node/_local/_config/chttpd/require_valid_user"

echo '[medic] setting max_http_request_size'
curl -X PUT --data '"4294967296"' "$COUCH/_node/_local/_config/httpd/max_http_request_size"

echo start e2e-servers
node /cht-core/scripts/e2e/e2e-servers.js > /tests/logs/e2e-server.log &
echo Creating logs dir
mkdir -p > /tests/logs/
echo Installing Horti
npm install -g horticulturalist 
echo INSTALL_LATEST is $INSTALL_LATEST
echo tag is $IS_TAG
if [ -n "$IS_TAG"  ] && [ -z "$INSTALL_LATEST" ]; then
    echo 'Setting vars for tag'
    UPGRADE=$BUILD
    HORTI_BUILDS_SERVER=$DEFAULT_BUILDS_URL
    BUILD='@medic:medic:release'
fi

echo 'Horti Env Vars'
echo Build server url $HORTI_BUILDS_SERVER
echo Upgrade var $UPGRADE
echo Build var $BUILD
echo 'Starting Horti'
horti --local --install=$BUILD > /tests/logs/horti.log
