#!/bin/bash

set -e

echo "build-ci: preparing"
./scripts/build/build-prepare.sh

uglifyjs api/build/static/admin/js/main.js -o api/build/static/admin/js/main.js
uglifyjs api/build/static/admin/js/templates.js -o api/build/static/admin/js/templates.js

./scripts/build/cleancss-admin.sh

echo "build-ci: building webapp"
cd webapp
npm run build -- --configuration=production
npm run compile

echo "build-ci: building cht-form"
npm run build:cht-form -- --configuration=production

cd ..

node ./scripts/build/cli createStagingDoc

node ./scripts/build/cli populateStagingDoc

echo "build-ci: done"
