#!/bin/bash -eu
set -e
docker compose -f ./api/tests/integration/compose.yml down --remove-orphans
