#!/bin/bash
set -e

if [ -z $INSTANCE_URL ]
then
    echo "Please pass the instance url via INSTANCE_URL environment variable"
    exit 1
fi

if [ -z $DATA_DIR ]
then
    echo "Please pass the path to the desired data directory via DATA_DIR environment variable"
    exit 1
fi

mkdir -p $DATA_DIR

npm ci
node ./generate-data.js $INSTANCE_URL $DATA_DIR
