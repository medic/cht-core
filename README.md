Develop      | Master 
------------ | -------------
[![Build Status](https://travis-ci.org/medic/medic-sentinel.png?branch=develop)](https://travis-ci.org/medic/medic-sentinel/branches) | [![Build Status](https://travis-ci.org/medic/medic-sentinel.png?branch=master)](https://travis-ci.org/medic/medic-sentinel/branches)

## Install

Get node deps with  `npm install`.

## Settings

Export a `COUCH_URL` env variable so sentinel knows what database to use. e.g.

```
export COUCH_URL='http://root:123qwe@localhost:5984/medic'
```

Sentinel works with Medic Mobile and listens to changes on the database. It is 
configured through the dashboard Medic Mobile app settings screen.

Default settings values are in `defaults.js`.

## Run

`node ./server.js`

Debug mode:

`node ./server.js debug`

## Run Tests

`npm test`
