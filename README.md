# kujua-api

Node server to support Medic Mobile.

Currently supports auditing by proxying requests to CouchDB and updating the audit history where required.

## Install

Get node deps with  `npm install`.

## Settings

Export a `COUCH_URL` env variable so sentinel knows what database to use. e.g.

```export COUCH_URL='http://root:123qwe@localhost:5984/medic'```

## Run

`node ./server.js`

## Test

`npm test`

## Build Status

Builds brought to you courtesy of [Travis CI](https://travis-ci.org/medic/kujua-api).

[![Build Status](https://travis-ci.org/medic/kujua-api.png?branch=master)](https://travis-ci.org/medic/kujua-api/branches)