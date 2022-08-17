#!/bin/bash
set -e

THREADS=300
BATCHES=10
THREADS_IN_BATCH=$(($THREADS/$BATCHES))

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

if [ -z $SKIP ]
then
    SKIP=0
fi

mkdir -p $DATA_DIR
mkdir -p $DATA_DIR/dbs

npm ci

node ./generate-login-list.js

for BATCH in $(seq 0 $(($BATCHES-1)))
do
  for THREAD in $(seq 1 $THREADS_IN_BATCH)
  do
    CURRENT_THREAD=$(($THREADS_IN_BATCH*$BATCH+$THREAD+$THREADS*$SKIP))
    echo "Initial replication ${CURRENT_THREAD} of $(($THREADS))"
    node ./initial-replication.js $INSTANCE_URL $DATA_DIR $CURRENT_THREAD &
  done
  wait
done

