#!/bin/bash

#####################################################
# Upgrade node from 8 to latest 8 or 12             #
# Defaults to version 12, but you can               #
#     pass "8" or "12" as arguments                 #
#                                                   #
# Only for use on CHT 3.x instances that have       #
# TLS issues on outbound push                       #
#                                                   #
# see https://github.com/medic/cht-core/issues/7957 #
# see https://github.com/medic/config-muso/issues/1016 #
#                                                   #
#####################################################

set -e

NODE_VERSION="${1:-12}"

if [ "$NODE_VERSION" = "12" ];then
  NODE_VERSION="12.22.12"
else
  NODE_VERSION="8.17.0"
fi

# change BRANCH to "node-8-upgrade-script" to test before merging PR
BRANCH="master"
FILE="/srv/node.${NODE_VERSION}.zip"
URL="https://raw.githubusercontent.com/medic/cht-core/$BRANCH/scripts/cht-3x-node-upgrade/node.${NODE_VERSION}.zip"

echo ""
echo "Start to install latest Node ${NODE_VERSION}..."
echo ""

echo "Current Node version installed before upgrade:"
/srv/software/medic-core/v2.1.1/x64/bin/node -v

echo ""
echo "Installing zip..."
echo ""

cd /srv

apt-get -qq update
apt-get -qq install -y zip
echo ""
echo "Stopping services..."
echo ""

/boot/svc-stop medic-core
/boot/svc-stop medic-api
/boot/svc-stop medic-sentinel

echo ""
echo "Downloading node and installing..."
echo ""
echo "Writing to: $FILE"
echo "Curling from: $URL"
echo ""

curl -so $FILE $URL

unzip $FILE
chmod +x node
mv /srv/node /srv/software/medic-core/v2.1.1/x64/bin/node
rm /srv/node.${NODE_VERSION}.zip


echo ""
echo "Starting services backup..."
echo ""
/boot/svc-start medic-core
/boot/svc-start medic-api
/boot/svc-start medic-sentinel

echo ""
echo "Upgrade complete!  Node version installed:"
/srv/software/medic-core/v2.1.1/x64/bin/node -v
echo ""
