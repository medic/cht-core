#! /bin/bash
# since we want to use the  DRY principle and docker expects all files used to be in the same
# context as the dockerfile, we use this file to do the initial heavy lofting of copying the functions
# file into a directory that docker can see.
# copy functions file to current directory

cp ../../../scripts/bash_functions/functions.sh ../../functions.sh

# clean up past images

docker-compose -f docker-compose.test.yml down

# run tests
docker-compose -f docker-compose.test.yml  run sut /app/tests/docker/bats/bin/bats /app/tests/docker/test.bats