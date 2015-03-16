# couchdb-audit

An npm and Kanso module for auditing changes to couchdb documents.

## Node

### Install

```npm install couchdb-audit```

### Include

#### Nano

```var audit = require('couchdb-audit').withNano(db, dbName, designName, user)```

* `db`: a [Nano](https://github.com/dscape/nano) module
* `dbName`: the name of the database to use
* `designName`: the name of the design document to use
* `user`: a String or callback which fetches the username

#### Felix

```var audit = require('couchdb-audit').withFelix(db, user)```

* `db`: a [Felix CouchDB](https://github.com/felixge/node-couchdb) module
* `user`: a String or callback which fetches the username

## Kanso

### Install

Include `"couchdb-audit": null` in your kanso.json.

### Include

```var audit = require('couchdb-audit/kanso').withKanso(db)```

Where `db` is a [Kanso DB](https://github.com/kanso/db) module.

## Usage

Then call saveDoc, bulkSave, removeDoc, get, or log.

## Caveat

This package is in its infancy, use with caution.

## Development

### Publishing

`kanso publish`
`npm publish`

### Testing

`grunt test` for the Node implementation. Deploy to kanso to run the kanso tests.

### Build Status

Builds brought to you courtesy of [Travis CI](https://travis-ci.org/medic/couchdb-audit).

[![Build Status](https://travis-ci.org/medic/couchdb-audit.png?branch=master)](https://travis-ci.org/medic/couchdb-audit/branches)