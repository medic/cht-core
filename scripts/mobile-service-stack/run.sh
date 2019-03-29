
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


docker-compose down # In case
node ./dns/deploy-hydrated-template.js

docker-compose up -d
docker exec medic-dns service bind9 start

host dev.medic.local 127.0.0.1