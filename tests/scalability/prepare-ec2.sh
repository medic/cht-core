#!/bin/bash
set -e

add_ssh_keys(){
  echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIARW6HBO5RDEHDPBOLsajCEAxP/Cn+uGQwPdBz89q5D3 mrjones@airbuntu2" >> /home/ubuntu/.ssh/authorized_keys
  echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHSPFnouayrnP39+7Y3CrMOco8BFCVQitOLwnwFEgFOi mrjones@theplip" >> /home/ubuntu/.ssh/authorized_keys
  echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKlJwZnBVjIpPgUu2GF34cPwUIFXapstbch8XfLn3rfR mrjones@plip.com" >> /home/ubuntu/.ssh/authorized_keys
}

set_hostname(){
  sudo hostnamectl set-hostname $1
}

install_docker(){
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh ./get-docker.sh
}

install_cht(){
  COMPOSE_URL="https://staging.dev.medicmobile.org/_couch/builds_4/medic:medic:${BUILD}"
  mkdir -p /cht/upgrade-service  /cht/compose
  curl -s https://raw.githubusercontent.com/medic/cht-upgrade-service/main/docker-compose.yml \
    -o /cht/upgrade-service/docker-compose.yml
  curl -s "$BUILD"/docker-compose/cht-core.yml -o /cht/compose/cht-core.yml
  curl -s "$BUILD"/docker-compose/cht-couchdb.yml -o /cht/compose/cht-couchdb.yml

  cd /cht/upgrade-service/
  cat > /cht/upgrade-service//.env <<- EOF
DOCKER_CONFIG_PATH=/home/.docker
CHT_COMPOSE_PATH=/cht/compose
COUCHDB_PASSWORD=medicScalability
EOF
  docker compose --progress quiet up --detach
}

install_local_ip_cert(){
  max=500
  count=0
  while [[ count -le max  ]]; do
    nginx=$(docker ps --format "table {{.Names}}" | grep cht-nginx-1)
    if [[ "$nginx" == "cht-nginx-1" ]]; then

      curl -sO https://raw.githubusercontent.com/medic/cht-core/refs/heads/master/scripts/add-local-ip-certs-to-docker.sh
      bash ./add-local-ip-certs-to-docker.sh cht-nginx-1
      count=max
    fi
    ((count=count+1))
    echo "waiting for nginx to be ready..."
    sleep 1
  done
}

install_node_exporter(){
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

enabe_node_exporter(){
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

CHT_VERSION=$2
HOST_NAME=$3
sudo su -
set_hostname "$HOST_NAME"
add_ssh_keys
install_docker
install_cht "$CHT_VERSION"
install_node_exporter
enabe_node_exporter
install_local_ip_cert
