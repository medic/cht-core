#!/bin/bash

ARGS='this.dependencies["kanso-gardener"] = null;'
ARGS+='this.dependencies_included = true;'

# Process append to the version string if pre-release
if [ "$TRAVIS_BRANCH" == "testing" ]; then
    ARGS+="this.version += \"-beta.$TRAVIS_BUILD_NUMBER\";"
fi

if [ "$TRAVIS_BRANCH" == "develop" ]; then
    ARGS+="this.version += \"-alpha.$TRAVIS_BUILD_NUMBER\";"
fi

if [ "$TRAVIS_BRANCH" == "rc" ]; then
    ARGS+="this.version += \"-rc.$TRAVIS_BUILD_NUMBER\";"
fi

# Install npm deps in module directories and tweak kanso gardener related
# configs so it knows.
npm install -g json && \
cat kanso.json | json -o json-4 -e "$ARGS" > tmp.json && \
mv tmp.json kanso.json

exit 0;
