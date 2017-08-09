#!/bin/bash -e

if [ "$TRAVIS_PULL_REQUEST" != "false" ]; then
    echo 'This is a pull request build, and will not be uploaded to builds database.'
    exit
fi

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

npm install nsp -g

# Final security check to block publishing if we have insecure
# packages
function nspcheck {
    (echo 'Checking medic-webapp' && nsp check) ||
    (echo 'Checking medic-api' && cd api && nsp check) ||
    (echo 'Checking medic-sentinel' && cd sentinel && nsp check)
}

echo 'Building build for builds database...'
if [[ -n "$TRAVIS_TAG" ]]; then
    nspcheck
    node --stack_size=10000 `which kanso` push --minify \
            --id="$TRAVIS_TAG" \
            "$UPLOAD_URL"/_couch/builds
else
    nspcheck || true; # We're OK with this failing for branches
    node --stack_size=10000 `which kanso` push --minify \
            --id="$TRAVIS_BRANCH" \
            "$UPLOAD_URL"/_couch/builds
fi
echo 'Build for build database built.'
