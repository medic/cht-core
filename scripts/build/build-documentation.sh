#!/bin/bash

set -e

echo "build-documentation: building jsdocs"
jsdoc -d jsdocs/admin -c node_modules/angular-jsdoc/common/conf.json -t node_modules/angular-jsdoc/angular-template admin/src/js/**/*.js
jsdoc -d jsdocs/sentinel sentinel/src/**/*.js
jsdoc -d jsdocs/api -R api/README.md api/src/**/*.js
jsdoc -d jsdocs/shared-libs shared-libs/**/src/**/*.js
echo "build-documentation: done"
