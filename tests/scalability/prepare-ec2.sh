#!/bin/bash
set -e

shutdown -P +60
mkdir /cht
chmod 777 /cht;

# Install Docker CE
apt-get update
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo \
  "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io

# Install docker-compose
curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" \
-o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

mkdir /cht/upgrade-service
mkdir /cht/compose

curl -s https://raw.githubusercontent.com/medic/cht-upgrade-service/main/docker-compose.yml \
  -o /cht/upgrade-service/docker-compose.yml
curl -s $BUILD/docker-compose/cht-core.yml -o /cht/compose/cht-core.yml
curl -s $BUILD/docker-compose/cht-couchdb.yml -o /cht/compose/cht-couchdb.yml

cd /cht/upgrade-service/
cat > ./.env << EOF
DOCKER_CONFIG_PATH=/home/.docker
CHT_COMPOSE_PATH=/cht/compose
COUCHDB_PASSWORD=medicScalability
EOF
docker-compose up -d
