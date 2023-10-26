#!/bin/bash

set -e

echo "copy-static-files: copying"

cp api/node_modules/bowser/bundled.js api/src/public/login/lib-bowser.js
cp -r api/src/public/* api/build/static/
cp -r webapp/src/audio webapp/src/fonts webapp/src/img api/build/static/webapp/
cp -r admin/src/templates/index.html admin/node_modules/font-awesome/fonts webapp/src/fonts api/build/static/admin

echo "copy-static-files: done"
