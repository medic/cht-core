#!/bin/bash

MAX=50
COUNT=0

# Never push to market on pull requests
if [ "$TRAVIS_PULL_REQUEST" != "false" ]; then
    exit 0;
fi

cd sentinel && npm install && cd .. && \
cd api && npm install && cd ..

# Try pushing up to $MAX times.
function push {
    ((COUNT++))
    local market="$1"
    if [ $COUNT -le $MAX ]; then
        node --stack_size=10000 `which kanso` push --minify "http://travis-ci:a5nghmongP!@staging.dev.medicmobile.org/markets-$market/upload" && exit 0
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

exit 0;
