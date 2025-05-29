#!/bin/bash

set -e

echo "copy-static-files: copying"

cp node_modules/bowser/bundled.js api/src/public/login/lib-bowser.js
cp -r api/src/public/* api/build/static/
cp api/src/resources/logo/cht-logo-light.png api/build/static/webapp/img/
cp -r webapp/src/audio api/build/static/webapp/
cp -r webapp/src/fonts api/build/static/webapp/
cp -r webapp/src/img api/build/static/webapp/
cp admin/src/templates/index.html api/build/static/admin
cp -r admin/node_modules/font-awesome/fonts api/build/static/admin
cp -r webapp/src/fonts api/build/static/admin

echo "copy-static-files: done"
