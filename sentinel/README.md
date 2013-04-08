# Kujua Sentinel

Sentinel is required for certain forms that have the `use_sentinel` property
set to true.

## Install

Get node deps with  `npm install`.

## Configuration

Export a `COUCH_URL` env variable so sentinel knows what database to use. e.g.

```
export COUCH_URL='http://root:123qwe@localhost:5984/kujua-base'
```

A configuration will be generated from `config.js` and saved at
`db/sentinel-configuration` you can make your configuration changes to this
document and save it as part of the project source files.

## Run

`node ./server.js`

## Run Tests

`npm test`
