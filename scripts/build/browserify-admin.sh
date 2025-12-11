#!/bin/bash

set -e

echo "browserify-admin: making dir"
mkdir -p api/build/static/admin/js/

echo "browserify-admin: running browserify on main.js"
browserify \
  --debug \
  -t browserify-ngannotate \
  -r './node_modules/google-libphonenumber:google-libphonenumber' \
  -r './node_modules/gsm:gsm' \
  -r './node_modules/object-path:object-path' \
  -r './node_modules/bikram-sambat:bikram-sambat' \
  -r './node_modules/lodash/core:lodash/core' \
  -r './shared-libs/constants:@medic/constants' \
  admin/src/js/main.js > api/build/static/admin/js/main.js

echo "browserify-admin: done"
