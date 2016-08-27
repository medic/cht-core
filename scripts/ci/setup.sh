#!/bin/bash -x

ARGS='this.dependencies["kanso-gardener"] = null;'
ARGS+='this.dependencies_included = true;'

# Process append to the version string if pre-release
if [ "$TRAVIS_BRANCH" == "master" ]; then
    ARGS+="this.version += \"-alpha.$TRAVIS_BUILD_NUMBER\";"
elif [[ "$TRAVIS_TAG" =~ ^[0-9]+\.[0-9]+\.[0-9]+-(rc|beta)\.[0-9]+$ ]]; then
    ARGS+="this.version = \"$TRAVIS_TAG\";"
fi

# Install npm deps in module directories and tweak kanso gardener related
# configs so it knows.
npm install -g json && \
cat kanso.json | json -o json-4 -e "$ARGS" > tmp.json && \
mv tmp.json kanso.json

exit 0;
