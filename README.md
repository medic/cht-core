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

`grunt test`

## Transitions API

A transition does async processing of a document once per rev/change, and obeys
the following rules:

* accepts a document as a reference and makes changes using that reference,
  copying is discouraged.
  
* does not have side effects outside of the document passed in.  This might be
  extended in the future to manage changes to multiple documents, but for now
  the transition is responsible for these types of changes.

* guarantees the consistency of a document. 

* runs serially in any order.

* is repeatable, it can run multiple times on the same document without
  negative effect.  You can use the `transitions` property on a document to
  determine if a transition has run.


Callback arguments:

* callback(err, true)

  The document is saved and `ok` property value is false if `err` is truthy.

* callback(err)

  The document is saved and `ok` property value is false if `err` is truthy.
  Use this when a transition fails and should be re-run.

* callback()

  Nothing to be done, the document is not saved and next transition continues.
  Transitions will run again on next change.
