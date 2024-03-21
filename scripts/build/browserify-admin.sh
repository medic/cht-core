#!/bin/bash

set -e

echo "browserify-admin: making dir"
mkdir -p api/build/static/admin/js/

echo "browserify-admin: running browserify on main.js"
browserify \
  --debug \
  -t browserify-ngannotate \
  -r './admin/node_modules/google-libphonenumber:google-libphonenumber' \
  -r './admin/node_modules/gsm:gsm' \
  -r './admin/node_modules/object-path:object-path' \
  -r './admin/node_modules/bikram-sambat:bikram-sambat' \
  -r './admin/node_modules/lodash/core:lodash/core' \
  admin/src/js/main.js > api/build/static/admin/js/main.js

echo "browserify-admin: done"
