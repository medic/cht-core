#!/bin/bash -e

# Attempt to reduce size of api and sentinel artifacts
(cd sentinel &&
    npm install --production &&
    rm -rf test &&
    rm -rf ./node_modules/*/test &&
    rm -rf ./node_modules/*/tests)
(cd api &&
    npm install --production &&
    rm -rf tests &&
    rm -rf ./node_modules/*/test &&
    rm -rf ./node_modules/*/tests)

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
