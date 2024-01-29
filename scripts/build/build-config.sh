#!/bin/bash

set -e

echo "build-config: running cht-conf"

node ./node_modules/.bin/cht \
  --skip-dependency-check \
  --archive \
  --source=config/default \
  --destination=api/build/default-docs \
  upload-app-settings \
  upload-app-forms \
  upload-collect-forms \
  upload-contact-forms \
  upload-resources \
  upload-custom-translations

echo "build-config: done"

