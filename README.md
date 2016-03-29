# medic-api

[API Documentation](API_v1.md)

Node server to support medic-webapp.

Currently supports auditing by proxying requests to CouchDB and updating the
audit history where required.

## Install

Get node deps with  `npm install`.

## Settings

Export a `COUCH_URL` env variable so sentinel knows what database to use. e.g.

```export COUCH_URL='http://root:123qwe@localhost:5984/medic'```

## Run

`grunt deploy`

## Test

`TEST_ENV=1 grunt test`

## Build Status

Builds brought to you courtesy of [Travis CI](https://travis-ci.org/medic/medic-api).

[![Build Status](https://travis-ci.org/medic/medic-api.png?branch=master)](https://travis-ci.org/medic/medic-api/branches)
