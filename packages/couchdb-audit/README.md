# couchdb-audit

An npm and Kanso module for auditing changes to couchdb documents.

## Node

### Install

```npm install couchdb-audit```

### Include

```var audit = require('couchdb-audit').withNode(db, user)```

Where `db` is a [Felix CouchDB](https://github.com/felixge/node-couchdb) module, and `user` is a String or callback which fetches the username.

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

## Publishing

`kanso publish`
`npm publish`

## Build Status

Builds brought to you courtesy of [Travis CI](https://travis-ci.org/medic/couchdb-audit).

[![Build Status](https://travis-ci.org/medic/couchdb-audit.png?branch=master)](https://travis-ci.org/medic/couchdb-audit/branches)