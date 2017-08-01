#!/bin/bash -x

set -o pipefail
set -e

ARGS='this.dependencies["kanso-gardener"] = null;'
ARGS+='this.dependencies_included = true;'

# Process append to the version string if pre-release
if [ "$TRAVIS_BRANCH" == "master" ]; then
    ARGS+="this.version += \"-alpha.$TRAVIS_BUILD_NUMBER\";"
elif [[ "$TRAVIS_TAG" =~ ^[0-9]+\.[0-9]+\.[0-9]+-(rc|beta)\.[0-9]+$ ]]; then
    ARGS+="this.version = \"$TRAVIS_TAG\";"
fi

# Run CI against submodule branch of the same name or master if not found.
# Depends on `branch = .` config in .gitmodules.
git submodule update --remote api
git submodule update --remote sentinel

# Install npm deps in module directories and tweak kanso gardener related
# configs so it knows.
npm install -g json
cat kanso.json | json -o json-4 -e "$ARGS" > tmp.json
mv tmp.json kanso.json

exit 0;
