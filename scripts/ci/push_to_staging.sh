#!/bin/bash -e

if [ "$TRAVIS_PULL_REQUEST" != "false" ]; then
    echo 'This is a pull request build, and will not be uploaded to builds database.'
    exit
fi

echo 'Building build for builds database...'
if [[ -n "$TRAVIS_TAG" ]]; then
    sed -i -e 's|"_id": "_design/medic"|"_id": "medic:medic:'$TRAVIS_TAG'"|g' ddocs/medic.json
else
    sed -i -e 's|"_id": "_design/medic"|"_id": "medic:medic:'$TRAVIS_BRANCH'"|g' ddocs/medic.json
fi

node --stack_size=10000 `which grunt` couch-push:staging

echo 'Build for build database built.'
