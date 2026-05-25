#!/bin/bash
set -e

# Call this remotely by curling it then passing in CHT version and machine name:
#   curl -O https://raw.githubusercontent.com/medic/cht-core/refs/heads/medic-infra-1394-graviton-do-not-merge/tests/scalability/prepare-ec2.sh
#   bash prepare-ec2.sh 5.1.0 mrjones-test-deleteme


add_ssh_keys(){
  echo "starting add_ssh_keys"
  mkdir -p /home/ubuntu/.ssh/
  touch /home/ubuntu/.ssh/authorized_keys
  echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCeiJ17mk+U7EOPqs5jKCBS+WpobaoH78co52rLv83JARJZA/1o9PscdwkojPpvaOrc7ZMaACwjtzueUzTIczSyI1pSM7b7C55bcua03oST0AxoJ5jgaYWFDLPjHRw/MinfYtF1KCDYNJ5RyqHEo2dRVVgbfa/tJU4IBT1Y4CKFWbBVLPPtTSxotoBTqFhl5tPfGko7S/idsOx1SHL2Qbw4D99zdeggCkQPHiXuf585BFTgi9AH/4rxhGWKyc0zoWyAn18ujcJ/F6qRGCckyH/mkjv/qm4gYP9dliPyfjbxuTumCINUbcoAYQf5IxFO1nxAv2gVgkUskgFTJQ1J+JsBx3yLRUd+0faX4mo90NWC+cuS5Z7xqfucz8Mt3+Jb65ri0tAurZCNzMW68qJmPYeNS273eJiu2tZUNcm9vCdarwpsTNoZQ/w1fQ0kxV5nRIs9YE5kHqj3tB0L8EkRvUlMxu2bAeng1GkL0/QXgK+pmhpdZ1ZmGhgHicntMqq+osE= diana@laptop" >> /home/ubuntu/.ssh/authorized_keys
  echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIARW6HBO5RDEHDPBOLsajCEAxP/Cn+uGQwPdBz89q5D3 mrjones@airbuntu2" >> /home/ubuntu/.ssh/authorized_keys
  echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHSPFnouayrnP39+7Y3CrMOco8BFCVQitOLwnwFEgFOi mrjones@theplip" >> /home/ubuntu/.ssh/authorized_keys
  echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKlJwZnBVjIpPgUu2GF34cPwUIFXapstbch8XfLn3rfR mrjones@plip.com" >> /home/ubuntu/.ssh/authorized_keys
}

set_hostname(){
  echo "starting set_hostname"
  hostnamectl set-hostname $1
}

install_docker(){
  echo "starting install_docker"
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh ./get-docker.sh
}

install_cht(){
  echo "starting install_cht"
  BUILD=$1
  COMPOSE_URL="https://staging.dev.medicmobile.org/_couch/builds_4/medic:medic:$BUILD"
  mkdir -p /cht/upgrade-service  /cht/compose
  curl -s https://raw.githubusercontent.com/medic/cht-upgrade-service/main/docker-compose.yml \
    -o /cht/upgrade-service/docker-compose.yml
  curl -s "$COMPOSE_URL"/docker-compose/cht-core.yml -o /cht/compose/cht-core.yml
  curl -s "$COMPOSE_URL"/docker-compose/cht-couchdb.yml -o /cht/compose/cht-couchdb.yml

  echo "    install_cht got compose files"
  echo "    install_cht starting CHT"
  cd /cht/upgrade-service/
  cat > /cht/upgrade-service//.env <<- EOF
DOCKER_CONFIG_PATH=/home/.docker
CHT_COMPOSE_PATH=/cht/compose
COUCHDB_PASSWORD=medicScalability
EOF
  docker compose --progress quiet up --detach
  cd
  echo "    install_cht CHT started"
}

install_local_ip_cert(){
  echo "starting install_local_ip_cert"
  curl -sO https://raw.githubusercontent.com/medic/cht-core/refs/heads/master/scripts/add-local-ip-certs-to-docker.sh
  bash ./add-local-ip-certs-to-docker.sh cht-nginx-1
}

install_node_exporter(){
  echo "starting install_node_exporter"
  arch=$(dpkg --print-architecture)
  node_exp_url='https://github.com/prometheus/node_exporter/releases/download/v1.11.1/node_exporter-1.11.1.linux-'
  if [[ "$arch" == "amd64" ]]; then
    node_exp_url="${node_exp_url}amd64.tar.gz"
  elif [[ "$arch" == "arm64" ]]; then
    node_exp_url="${node_exp_url}arm64.tar.gz"
  else
    echo "${node_exp_url} not found, exiting"
    exit 1
  fi
  echo "fetching from ${node_exp_url} "
  curl -sLO ${node_exp_url}
  tar xvzf node_exporter-1.11.1.linux-*.tar.gz
  mv node_exporter-1.11.1.linux-*/node_exporter /usr/local/bin/node_exporter
}

enable_node_exporter(){
  echo "starting enable_node_exporter"
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
}

if [ "$EUID" -ne 0 ]
  then echo "Please run as root"
  exit
fi

CHT_VERSION=$1
HOST_NAME=$2
echo "START, CHT_VERSION ${CHT_VERSION} hostname ${HOST_NAME}"
set_hostname "$HOST_NAME"
add_ssh_keys
install_docker
install_cht "$CHT_VERSION"
install_node_exporter
enable_node_exporter
install_local_ip_cert
echo "DONE"
