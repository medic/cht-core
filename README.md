Develop      | Master 
------------ | -------------
[![Build Status](https://travis-ci.org/medic/kujua-sentinel.png?branch=develop)](https://travis-ci.org/medic/kujua-sentinel/branches) | [![Build Status](https://travis-ci.org/medic/kujua-sentinel.png?branch=master)](https://travis-ci.org/medic/kujua-sentinel/branches)

## Install

Get node deps with  `npm install`.

## Settings

Export a `COUCH_URL` env variable so sentinel knows what database to use. e.g.

```
export COUCH_URL='http://root:123qwe@localhost:5984/kujua-lite'
```

Sentinel works with Kujua Lite and listens to changes on the database. It is 
configured through the dashboard Kujua app settings screen.

Default settings values are in `defaults.js`.

## Run

`node ./server.js`

## Run Tests

`npm test`
