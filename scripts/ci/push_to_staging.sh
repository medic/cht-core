#!/bin/bash -e

# Attempt to reduce size of api and sentinel artifacts
(cd sentinel &&
    echo '[medic-sentinel] Available modules:' && ls node_modules &&
    npm install --production &&
    echo '[medic-sentinel] Available modules:' && ls node_modules &&
    rm -rf test &&
    rm -rf ./node_modules/*/test &&
    rm -rf ./node_modules/*/tests &&
    echo '[medic-sentinel] Available modules:' && ls node_modules)
(cd api &&
    echo '[medic-api] Available modules:' && ls node_modules &&
    npm install --production &&
    echo '[medic-api] Available modules:' && ls node_modules &&
    rm -rf tests &&
    rm -rf ./node_modules/*/test &&
    rm -rf ./node_modules/*/tests
    echo '[medic-api] Available modules:' && ls node_modules)

echo 'Building build for builds database...'
if [[ -n "$TRAVIS_TAG" ]]; then
    node --stack_size=10000 `which kanso` push --minify \
            --id="$TRAVIS_TAG" \
            "$UPLOAD_URL"/_couch/builds
else
    node --stack_size=10000 `which kanso` push --minify \
            --id="$TRAVIS_BRANCH" \
            "$UPLOAD_URL"/_couch/builds
fi
echo 'Build for build database built.'
