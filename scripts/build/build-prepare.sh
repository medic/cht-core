#!/bin/bash

set -e

echo "build-prepare: cleaning build directory"
rm -rf build
mkdir build

echo "build-prepare: building ddocs"
npm run build-ddocs

echo "build-prepare: compiling enketo css"
sass webapp/src/css/enketo/enketo.scss api/build/static/webapp/enketo.less --no-source-map

echo "build-prepare: building admin app"
node ./scripts/build/build-angularjs-template-cache.js
./scripts/build/browserify-admin.sh
lessc admin/src/css/main.less api/build/static/admin/css/main.css

echo "build-prepare: building config"
./scripts/build/build-config.sh

echo "build-prepare: done"
