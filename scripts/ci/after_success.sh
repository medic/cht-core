#!/bin/bash -e

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

(cd sentinel &&
    npm install --production &&
    rm -rf test &&
    rm -rf ./node_modules/*/test &&
    rm -rf ./node_modules/*/tests)
(cd api &&
    npm install --production &&
    rm -rf tests &&
    rm -rf ./node_modules/*/test &&
    rm -rf ./node_modules/*/tests)

function tagSubmodule {
    cd $1
    git tag $TRAVIS_TAG
    git push --tags
    cd ..
}

function tagSubmodules {
    tagSubmodule 'api'
    tagSubmodule 'sentinel'
}

### --- TODO delete this section when upgrade-from-api is accepted START --- ###

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

# every master build gets pushed to alpha market
if [ "$TRAVIS_BRANCH" == "master" ]; then
    push 'alpha'

# match tags of the form "0.n.n"
elif [[ "$TRAVIS_TAG" =~ ^0\.[0-9]+\.[0-9]+$ ]]; then
    push 'release'
    tagSubmodules

# match tags of the form "2.n.n"
elif [[ "$TRAVIS_TAG" =~ ^2\.[0-9]+\.[0-9]+$ ]]; then
    push 'release-v2'
    tagSubmodules

# match tags of the form "n.n.n-beta.n"
elif [[ "$TRAVIS_TAG" =~ ^[0-9]+\.[0-9]+\.[0-9]+-beta\.[0-9]+$ ]]; then
    push 'beta'

# match tags of the form "n.n.n-rc.n"
elif [[ "$TRAVIS_TAG" =~ ^[0-9]+\.[0-9]+\.[0-9]+-rc\.[0-9]+$ ]]; then
    push 'rc'

fi;

### ---- TODO delete this section when upgrade-from-api is accepted END ---- ###

echo 'Building build for builds database...'
if [[ -n "$TRAVIS_TAG" ]]; then
    node --stack_size=10000 `which kanso` push --minify \
            --id="$TRAVIS_TAG" \
            "$UPLOAD_URL"/_couch/builds
else
    node --stack_size=10000 `which kanso` push --minify \
            --id="$TRAVIS_BRANCH" \
            "$UPLOAD_URL"/_couch/builds
fi
echo 'Build for build database built.'

exit 0;
