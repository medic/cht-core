#!/bin/bash -x

MAX=50
COUNT=0
DONE=0

# Try pushing up to $MAX times.
function push {
    ((COUNT++))
    local URL="$1"
    if [ $COUNT -le $MAX ]; then
        kanso push "$URL" && DONE=1
        if [ $DONE == 1 ]; then 
            exit 0
        else 
            push $URL
        fi
    else
        echo 'Failed to push to market.'
        exit 1
    fi
}

if [ "$TRAVIS_BRANCH" == "develop" ]; then
    npm install -g jsontool &&
    cat kanso.json | json -o json-4 -e "dependencies[\"kanso-gardener\"] = null; version += \"-alpha.$TRAVIS_BUILD_NUMBER\";" > tmp.json &&
    mv tmp.json kanso.json &&
    push 'http://travis-ci:a5nghmongP!@staging.dev.medicmobile.org/markets/alpha/upload'
fi;

if [ "$TRAVIS_BRANCH" == "testing" ]; then
    npm install -g jsontool &&
    cat kanso.json | json -o json-4 -e "dependencies[\"kanso-gardener\"] = null; version += \"-beta.$TRAVIS_BUILD_NUMBER\";" > tmp.json &&
    mv tmp.json kanso.json &&
    push 'http://travis-ci:a5nghmongP!@staging.dev.medicmobile.org/markets/beta/upload'
fi;

exit 0;
