# Kujua Sentinel

Sentinel is required for certain forms that have the `use_sentinel` property
set to true.

## Install

Get node deps with  `npm install`.

## Settings

Export a `COUCH_URL` env variable so sentinel knows what database to use. e.g.

```
export COUCH_URL='http://root:123qwe@localhost:5984/kujua-lite'
```

Sentinel works with Kujua Lite and listens to changes on the design doc. It can
be configured through the dashboard Kujua Lite app settings screen.

Default settings values are in `defaults.js`.

## Run

`node ./server.js`

## Run Tests

`npm test`
