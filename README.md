# kujua-api

Node server to support kujua-lite.

Currently supports auditing by proxying requests to CouchDB and updating the audit history where required.

## Install

Get node deps with  `npm install`.

## Settings

Export a `COUCH_URL` env variable so sentinel knows what database to use. e.g.

```export COUCH_URL='http://root:123qwe@localhost:5984/kujua-lite'```

## Run

`node ./server.js`

## Test

`npm test`
