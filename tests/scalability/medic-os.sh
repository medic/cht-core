#!/bin/bash
sudo shutdown -P +60
sudo mkfs -t ext4 /dev/nvme0n1;
sudo mount /dev/nvme0n1 /srv;
sudo chmod 777 /srv;
cd /srv;
git clone https://github.com/medic/cht-infrastructure.git;
cd cht-infrastructure/self-hosting/prepare-system/ubuntu/;
mkdir -p /home/medic/self-hosting/main/
echo DOCKER_COUCHDB_ADMIN_PASSWORD=medicScalability >> /home/medic/self-hosting/main/.env
echo HA_PASSWORD=medicScalability >> /home/medic/self-hosting/main/.env
./prepare.sh
