#!/bin/sh

cd kujua-api &&
npm install &&
cd .. &&
./scripts/phantom_test.sh http://localhost:5984/kujua-lite
