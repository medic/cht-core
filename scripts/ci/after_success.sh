#!/bin/bash

MAX=50
COUNT=0

if [ "$TRAVIS_PULL_REQUEST" != "false" ]; then
    echo 'Not pushing to market on pull requests.'
    exit 0;
fi

if [ -z "$UPLOAD_URL" ]; then
    echo 'Please define UPLOAD_URL.'
    exit 1;
fi

cd sentinel && npm install && cd .. && \
cd api && npm install && cd ..

# Try pushing up to $MAX times.
function push {
    ((COUNT++))
    local market="$1"
    if [ $COUNT -le $MAX ]; then
        node --stack_size=10000 `which kanso` push --minify \
            "${UPLOAD_URL}/markets-$market/upload" && exit 0
        push $market
    else
        echo 'Failed to push to market.'
        exit 1
    fi
}

if [ "$TRAVIS_BRANCH" == "master" ]; then
    push 'release'
fi;

if [ "$TRAVIS_BRANCH" == "testing" ]; then
    push 'beta'
fi;

if [ "$TRAVIS_BRANCH" == "develop" ]; then
    push 'alpha'
fi;

if [ "$TRAVIS_BRANCH" == "v2" ]; then
    push 'release-v2'
fi;

exit 0;
