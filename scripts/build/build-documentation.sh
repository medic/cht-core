#!/bin/bash

set -e
shopt -s extglob

echo "build-documentation: building jsdocs"
(cd admin && jsdoc -d ../jsdocs/admin -c node_modules/angular-jsdoc/common/conf.json -t node_modules/angular-jsdoc/angular-template src/js/**/*.js)
jsdoc -d jsdocs/sentinel sentinel/src/**/*.js
jsdoc -d jsdocs/api -R api/README.md api/src/**/*.js
jsdoc -d jsdocs/shared-libs shared-libs/!(cht-datasource)/src/**/*.js
npm run --prefix shared-libs/cht-datasource gen-docs
node scripts/build/generate-openapi.js
echo "build-documentation: done"
