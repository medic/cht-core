
# This script starts an authoritative DNS server which resolves *.medicmobile.local to the local machine's ip

#!/usr/bin/env bash
exit_on_error() {
  exit_code=$?
  if [[ $exit_code -ne 0 ]]; then
    printf "\033[0;31m== FAIL Exit code $? ==\n"
    exit $exit_code
  fi
}

set -e
trap exit_on_error EXIT


node ./dns/deploy-hydrated-template.js

docker-compose down # In case
docker-compose up -d

# Unsure why this is required and we can't just use volumes like normal people
sleep 5
docker exec -i medic-bind cp -a /dns/. /data/bind/etc/
docker restart medic-bind

host dev.medic.local 127.0.0.1