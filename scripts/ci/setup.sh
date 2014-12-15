#!/bin/bash -x

local meta="$1"
local args='this.dependencies["kanso-gardener"] = null;'
args+='this.dependencies_included = true;'

# Process meta portion of version string if provided
if [ "$TRAVIS_BRANCH" == "testing" ]; then
    args+="this.version += \"-beta.$TRAVIS_BUILD_NUMBER\";"
fi
if [ "$TRAVIS_BRANCH" == "develop" ]; then
    args+="this.version += \"-alpha.$TRAVIS_BUILD_NUMBER\";"
fi

# Install npm deps in module directories and tweak kanso gardener related
# configs so it knows.
npm install -g json && \
cat kanso.json | json -o json-4 -e "$args" > tmp.json && \
mv tmp.json kanso.json

exit 0;
