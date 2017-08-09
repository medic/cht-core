#!/bin/bash -e

if [ "$TRAVIS_PULL_REQUEST" != "false" ]; then
    echo 'This is a pull request build, and will not be uploaded to builds database.'
    exit
fi

# If we've got this far we know webapp has been checked by NSP, but api
# and sentinel may not have been, so check again.
(cd api && grunt nsp)
(cd sentinel && grunt nsp)

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
