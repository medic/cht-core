#!/bin/sh

# install deps for kujua-api 
cd kujua-api && \
npm install --production && \
cd .. && \
./scripts/phantom_test.sh http://localhost:5984/kujua-lite
