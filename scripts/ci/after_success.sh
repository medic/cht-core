#!/bin/bash

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

cd sentinel && npm install && cd .. && \
cd api && npm install && cd ..

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

# Try pushing up to $MAX times.
function push {
    ((COUNT++))
    local market="$1"
    local maxify=$2
    if [ $COUNT -le $MAX ]; then
        node --stack_size=10000 `which kanso` push \
            `[[ $maxify != true ]] && echo --minify` \
            "${UPLOAD_URL}/markets-$market/upload" && exit 0
        push $market
    else
        echo 'Failed to push to market.'
        exit 1
    fi
}

# every master build gets pushed to alpha market
if [ "$TRAVIS_BRANCH" == "master" ]; then
    push 'alpha' true

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
    push 'beta' true

# match tags of the form "n.n.n-rc.n"
elif [[ "$TRAVIS_TAG" =~ ^[0-9]+\.[0-9]+\.[0-9]+-rc\.[0-9]+$ ]]; then
    push 'rc'

fi;

exit 0;
