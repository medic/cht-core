#!/bin/sh

npm install -g jsontool

if [ "$TRAVIS_BRANCH" == "develop" ]; then
    cat kanso.json | json -o json-4 -e "dependencies[\"kanso-gardener\"] = null; version += \"-alpha.$TRAVIS_BUILD_NUMBER\";" > tmp.json && \
    mv tmp.json kanso.json && \
    kanso push http://service:a5nghmongP\!@staging.dev.medicmobile.org/markets/alpha/upload
fi;

if [ "$TRAVIS_BRANCH" == "testing" ]; then
    cat kanso.json | json -o json-4 -e "dependencies[\"kanso-gardener\"] = null; version += \"-beta.$TRAVIS_BUILD_NUMBER\";" > tmp.json && \
    mv tmp.json kanso.json && \
    kanso push http://service:a5nghmongP\!@staging.dev.medicmobile.org/markets/beta/upload
fi;

exit 0;
