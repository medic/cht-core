
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

# Clean up any previous runs
docker-compose down

# Create some data and launch the services
node ./dns/deploy-hydrated-template.js
docker-compose up -d

# Test the service is running
host medic.dev 127.0.0.1