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

npm install nsp -g

# Final security check to block publishing if we have insecure
# packages
function nspcheck {
    nsp check &&
    (cd api && nsp check) &&
    (cd sentinel && nsp check)
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
