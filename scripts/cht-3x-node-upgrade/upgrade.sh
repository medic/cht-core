#!/bin/bash

#####################################################
# Upgrade node from 8 -> 12                         #
#                                                   #
# Only for use on CHT 3.x instances that have       #
# TLS issues on outbound push                       #
#                                                   #
# see https://github.com/medic/cht-core/issues/7957 #
#                                                   #
#####################################################

echo "Start...Node version installed:"
/srv/software/medic-core/v2.1.1/x64/bin/node -v


echo ""
echo "Installing zip..."
echo ""

cd /srv

apt -qq update
apt  -qq install -y zip
echo ""
echo "Stopping services..."
echo ""

/boot/svc-stop medic-core
/boot/svc-stop medic-api
/boot/svc-stop medic-sentinel

echo ""
echo "Downloading node and installing..."
echo ""

curl -so /srv/node.12.22.12.zip https://raw.githubusercontent.com/medic/cht-core/master/scripts/cht-3x-node-upgrade/node.12.22.12.zip

unzip /srv/node.12.22.12.zip
chmod +x node
mv /srv/node /srv/software/medic-core/v2.1.1/x64/bin/node
rm /srv/node.12.22.12.zip


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
