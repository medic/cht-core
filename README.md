[![Build Status](https://travis-ci.org/medic/medic-sentinel.png?branch=master)](https://travis-ci.org/medic/medic-sentinel)

## Install

Get node deps with  `npm install`.

## Run

`node server.js`

Debug mode:

`node server.js debug`

## Run Tests

`grunt test`


## Overview

Sentinel listens to the CouchDB changes feed and runs a set of
[transitions](#transitions-api)  on on a given database change.  It also
manages scheduled tasks like message schedules.


## Settings

Export a `COUCH_URL` env variable so sentinel knows what database to use. e.g.

```bash
export COUCH_URL='http://admin:pass@localhost:5984/medic'
```

Throughout this document we will be refering to `ddoc`. Here we mean the
currently deployed `_design/medic` ddoc from medic-webapp.

Default settings values are in `defaults.js`.  On initial start, and when there
are changes to the ddoc, sentinel reads `ddoc.app_settings` to determine
configuration.

By default all transitions are disabled, to enable a transition modify the
`transitions` property on `ddoc.app_settings`.

### Transitions Configuration Examples

#### Enabled

A transition is enabled if the value associated with its name is
[truthy](https://developer.mozilla.org/en-US/docs/Glossary/Truthy).

In both of these examples all three transitions are enabled:

```json
{
  "transitions": {
    "registrations": true,
    "default_responses": true,
    "update_clinics": true
  }
}
```

```json 
{
  "transitions": {
    "registrations": {
      "param": "val"
    },
    "default_responses": {},
    "update_clinics": {}
  }
}
```

#### Disabled

A transition is disabled if either the value associated with its name is [falsey](https://developer.mozilla.org/en-US/docs/Glossary/Falsy), or it has `"disable"` set to `true`, or the transition is missing.

In all three examples below the `registrations` transition is disabled.

```json
{
  "transitions": {}
}
```

```json
{
  "transitions": {
    "registrations": false
  }
}
```

```json
{
  "transitions": {
    "registrations": {
      "disable": true
    }
  }
}
```

## Transitions API

A transition is javascript code that runs when a document is changed.  A
transition can edit the changed doc or do anything server side code can do for
that matter.

Transitions are run in series, not in parallel:

* For a given change, you can expect one transition to be finished before the
  next runs.

* You can expected one change to be fully processed by all transitions before
  the next starts being processed.

Transitions obey the following rules:

* has a `filter(doc)` function that accepts the changed document as an argument and
  returns `true` if it needs to run/be applied.

* a `onMatch(change, db, auditDb, callback)` function than will run on changes
  that pass the filter.

* has an `onChange(change, db, audit, callback)` function that makes changes to
  the `change.doc` reference (copying is discouraged). `db` and `audit` are
  handles to let you query those DBs. More about `callback` below.

* takes responsibility for saving the document and re-attaching the newly saved
  document (with new seq etc) at `change.doc`
  
* does not have side effects outside of `change.doc`.  This might be
  extended in the future to manage changes to multiple documents, but for now
  the transition is responsible for these types of changes.

* guarantees the consistency of a document. 

* runs serially and in any order.  A transition is free to make async calls but
  the next transition will only run after the previous transitions's callback
  is called. If your transition is dependent on another transition then it will
  run on the next change.  Code your transition to support two changes rather
  than require a specific ordering.  You can optimize your ordering but don't
  require it.  This keeps configuration simpler.

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
