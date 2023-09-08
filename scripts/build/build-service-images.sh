#!/bin/bash

set -e

echo "build-service-images: running"

./scripts/build/copy-static-files.sh
uglifyjs api/build/static/login/script.js -o api/build/static/login/script.js
uglifyjs api/build/static/login/lib-bowser.js -o api/build/static/login/lib-bowser.js
./scripts/build/cleancss-api.sh
node scripts/build/cli buildServiceImages
node scripts/build/cli buildImages

echo "build-service-images: done"
