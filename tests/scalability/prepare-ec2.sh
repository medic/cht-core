#!/bin/bash
set -e

# This script can be called remotely with:
# sudo su -
# source <(curl -s https://raw.githubusercontent.com/medic/cht-core/refs/heads/medic-infra-1394-graviton-do-not-merge/tests/scalability/prepare-ec2.sh)


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
curl -sO https://raw.githubusercontent.com/medic/cht-core/refs/heads/master/scripts/add-local-ip-certs-to-docker.sh

max=120
count=0
while [[ count -le max  ]]; do
  nginx=$(docker ps --format "table {{.Names}}" | grep cht-nginx-1)
  if [[ "$nginx" == "cht-nginx-1" ]]; then
    bash ./add-local-ip-certs-to-docker.sh cht-nginx-1
    count=max
  fi
  ((count=count+1))
done

arch=$(dpkg --print-architecture)

node_exp_url='https://github.com/prometheus/node_exporter/releases/download/v1.11.1/node_exporter-1.11.1.linux-'
if [[ "$arch" == "amd64" ]]; then
  node_exp_url="${node_exp_url}amd64.tar.gz"
  echo "found amd64"
elif [[ "$arch" e==q "arm64" ]]; then
  node_exp_url="${node_exp_url}arm64.tar.gz"
  echo "found arm64"
else
  echo "${node_exp_url} not found, exiting"
  exit 1
fi
curl -Os ${node_exp_url}
tar xvzf node_exporter-1.11.1.linux-*.tar.gz
mv node_exporter/bin/node_exporter /usr/local/bin/node_exporter

bash -c 'cat <<EOF > /etc/systemd/system/node_exporter.service
[Unit]
Description=Node Exporter
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
EOF'

systemctl daemon-reload
systemctl enable node_exporter
systemctl start node_exporter