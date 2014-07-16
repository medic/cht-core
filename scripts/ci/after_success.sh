#!/bin/bash -x

MAX=50
COUNT=0

# Never push to market on pull requests
if [ "$TRAVIS_PULL_REQUEST" != "false" ]; then
    exit 0;
fi

# Try pushing up to $MAX times.
function push {
    ((COUNT++))
    local URL="$1"
    if [ $COUNT -le $MAX ]; then
        kanso push --minify "$URL" && exit 0
        push $URL
    else
        echo 'Failed to push to market.'
        exit 1
    fi
}

function prep {
    local meta="$1"
    local args='this.dependencies["kanso-gardener"] = null;'
    args+='this.dependencies_included = true;'

    # Process meta portion of version string if provided
    if [ -n "$meta" ]; then
        args+="this.version += \"-${meta}\";"
    fi

    # Install npm deps in module directories and tweak kanso gardener related
    # configs so it knows.
    npm install -g json && \
    cd sentinel && npm install && cd .. && \
    cd api && npm install && cd .. && \
    cat kanso.json | json -o json-4 -e "$args" > tmp.json && \
    mv tmp.json kanso.json
}

if [ "$TRAVIS_BRANCH" == "master" ]; then
    prep && \
    push 'http://travis-ci:a5nghmongP!@staging.dev.medicmobile.org/markets-release/upload'
fi;

#if [ "$TRAVIS_BRANCH" == "develop" ]; then
#    prep "-alpha.$TRAVIS_BUILD_NUMBER" && \
#    push 'http://travis-ci:a5nghmongP!@staging.dev.medicmobile.org/markets-alpha/upload'
#fi;

if [ "$TRAVIS_BRANCH" == "testing" ]; then
    prep "beta.$TRAVIS_BUILD_NUMBER" && \
    push 'http://travis-ci:a5nghmongP!@staging.dev.medicmobile.org/markets-beta/upload'
fi;

if [ "$TRAVIS_BRANCH" == "inbox-design" ]; then
    prep "alpha.$TRAVIS_BUILD_NUMBER" && \
    push 'http://travis-ci:a5nghmongP!@staging.dev.medicmobile.org/markets-alpha/upload'
fi;

exit 0;
