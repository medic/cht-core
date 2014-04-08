#!/bin/sh

# confirm json-forms submodule tests also pass
cd json-forms/test &&
make &&
cd ../.. &&
./scripts/phantom_test.sh http://localhost:5984/kujua-lite
