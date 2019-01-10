#!/bin/sh

##
## REVIEWER: nicked from Diana. Do we want to formalise it like this, or as a
## grunt task, or as an npm task, or...?
##

grunt exec:reset-test-databases
grunt couch-push:test
./scripts/e2e-servers.js &
grunt protractor:e2e-tests
