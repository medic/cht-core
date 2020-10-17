## Install

Get node deps with  `npm ci`.

## Run

`node server.js`

Debug mode:

`node server.js debug`

## Overview

Sentinel listens to the CouchDB changes feed and runs a set of
[transitions](#additional-documentation) on a given database change.  It also
manages scheduled tasks like message schedules.

## Settings

Export a `COUCH_URL` env variable so sentinel knows what database to use. e.g.

```bash
export COUCH_URL='http://myAdminUser:myAdminPass@localhost:5984/medic'
```

Throughout this document we will be referring to `ddoc`. Here we mean the
currently deployed `_design/medic` ddoc from the medic app.

Default settings values are in `defaults.js`.  On initial start, and when there
are changes to the ddoc, sentinel reads `ddoc.app_settings` to determine
configuration.

By default all transitions are disabled, to enable a transition modify the
`transitions` property on `ddoc.app_settings`.

## Additional documentation

 * [Configuration guide](https://docs.communityhealthtoolkit.org/apps/reference/app-settings/transitions/)
 * [Development guide](https://docs.communityhealthtoolkit.org/core/overview/transitions/)
