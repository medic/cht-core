# Medic Mobile

These instructions should help you get setup to run or develop on Medic Mobile.
For latest changes and release announcements see our [change log](Changes.md).

## Overview

Medic Mobile combines messaging, data collection, and analytics for health workers and health systems in hard-to-reach areas with or without internet connectivity.

The `medic-webapp` repository is the core tool of the Medic Mobile stack. When health workers submit data — using text messages (SMS), our mobile applications, or our SIM applications — the web app confirms data submission, generates unique IDs, and schedules automated reminder messages based on user-defined configurations. All information submitted by mobile users can be viewed, filtered, verified, and exported using the reports tab in the web application.

The web app is fully responsive with a mobile-first design, and supports localization using any written language. It can be installed locally, as part of a virtual machine (see [medic-os](https://github.com/medic/medic-os)), or in the cloud.

For more information about Medic Mobile's tools, visit http://medicmobile.org/tools.
For more information about Medic Mobile's architecture and how the pieces fit together, see [Architecture Overview](https://github.com/medic/medic-docs/blob/master/development/architecture.md).
For more information about the format of docs in the database, see [Database Schema](https://github.com/medic/medic-docs/blob/master/development/db_schema.md).
For more information about the SMS exchange protocol between webapp and gateway, see [Message States](https://github.com/medic/medic-docs/blob/master/user/message-states.md).

## Development Setup

Before getting started, read about our [development workflow](https://github.com/medic/medic-docs/blob/master/md/dev/workflow.md) and the [architecture overview](https://github.com/medic/medic-docs/blob/master/development/architecture.md).

The setup described below doesn't use [Medic OS](https://github.com/medic/medic-docs/blob/master/development/architecture.md#medic-os), the tools will be run directly on your machine.


### Dependencies

You will need to install the following:

[Node.js](http://nodejs.org) 6.10.x and above ideally

[CouchDB](http://couchdb.apache.org) v2.x

[couchdb-lucene](https://github.com/rnewson/couchdb-lucene) v2.x (optional, only required for some in-app analytics)

### Setup CouchDB on a single node

NB: multiple CouchDB nodes will be more complicated, but the general pattern outlined below will be the same.

After installation and initial startup, visit Fauxton at
[http://127.0.0.1:5984/_utils#setup](http://127.0.0.1:5984/_utils#setup) and
finish setup for a single-node instance.  For more information see
the [CouchDB install doc](http://docs.couchdb.org/en/2.0.0/install/).


Setup admin access (note 5986 for single-node access):

```
curl -X PUT http://localhost:5986/_config/admins/admin -d '"pass"'
```

Reconfigure CouchDB to require authentication:

```
# CouchDB 1.6
curl -X PUT http://admin:pass@localhost:5986/_config/couch_httpd_auth/require_valid_user \
  -d '"true"' -H "Content-Type: application/json"
# CouchDB 2.0
curl -X PUT http://admin:pass@localhost:5986/_config/chttpd/require_valid_user \
  -d '"true"' -H "Content-Type: application/json"

```

The above command automatically modifies `local.ini` to contain:

```
[couch_httpd_auth]
require_valid_user = true
```

Create an admin user:

```
curl -X POST http://admin:pass@localhost:5984/_users \
  -H "Content-Type: application/json" \
  -d '{"_id": "org.couchdb.user:admin", "name": "admin", "password":"pass", "type":"user", "roles":[]}'
```

### Build dependenceis

[Kanso](http://kan.so) and [Grunt](http://gruntjs.com) are required to build and deploy the webapp.

```
npm install -g kanso grunt-cli
```

### Configure Lucene

Lucene is used for some in-app analytics. You probably do not need to install this for general development, but it is part of a proper production deployment.

Update `$lucene_home/conf/couchdb-lucene.ini` (if you installed with homebrew, `$lucene_home` is something like `/usr/local/Cellar/couchdb-lucene/1.0.2/libexec/`) so the URL has credentials, e.g.:

```
url=http://admin:pass@localhost:5984/
```

Start lucene using the `$lucene_home/bin/run` script.

You should now see an identical welcome message at two different URLs:

```
curl http://localhost:5985
{"couchdb-lucene":"Welcome","version":"1.0.2"}
```

## Build and run

### Build the webapp

```
git clone --recursive https://github.com/medic/medic-webapp
cd medic-webapp
npm install
```

Create a `.kansorc` file in the app directory with your CouchDB credentials, e.g.:

```
exports.env = {
  default: {
    db: "http://admin:pass@localhost:5984/medic",
    overrides: {loglevel:"debug"}
  }
};
```

### Push the webapp

`grunt dev` will build and deploy the webapp, then watch for changes and redeploy when necessary.


### Start medic-sentinel

```
cd sentinel
npm install
export COUCH_NODE_NAME=couchdb@localhost
export COUCH_URL=http://admin:pass@localhost:5984/medic
node ./server.js
```

See [Medic Sentinel](https://github.com/medic/medic-sentinel) for more information.

### Start medic-api

```
cd api
npm install
export COUCH_NODE_NAME=couchdb@localhost
export COUCH_URL=http://admin:pass@localhost:5984/medic
node ./server.js
```

See [Medic API](https://github.com/medic/medic-api) for more information.

### Try it out

Navigate your browser to `http://localhost:5988/medic/login`

### Data

To fill your app with generated data, you can batch-load messages from a CSV file, with the [load_messages.js](https://github.com/medic/medic-webapp/blob/master/scripts/load_messages.js) script.

Use `curl` to submit a single message:

```
curl -i -u gateway:123qwe \
    --data-urlencode 'message=Test One two' \
    --data-urlencode 'from=+13125551212' \
    --data-urlencode 'sent_timestamp=1403965605868' \
    -X POST \
    http://localhost:5988/api/v1/records
```

### Localization

All text labels in the app are localized. See the [translation documentation](https://github.com/medic/medic-docs/blob/master/development/translations.md) for more details on how to add new labels or modify existing ones.

## Tests
Check out the [Gruntfile](Gruntfile.js) for all the tests you can run.

### Unit tests
They live in [/tests/karma](tests/karma). Run them with grunt : `grunt unit_continuous`

### End to End tests
They live in [tests/protractor](tests/protractor). To run them:

1. Update Webdriver: `./node_modules/.bin/webdriver-manager update`
2. Start Webdriver: `./node_modules/.bin/webdriver-manager start`
3. Run tests: `grunt e2e-chrome`

### API integration tests
`grunt api_e2e`

### Kanso tests
Some kanso tests are run in-browser; you can run them manually if you browse to `/medic/_design/medic/_rewrite/test`.

### Integration tests
[Travis](https://travis-ci.org/medic/medic-webapp) runs `grunt ci` every time some new code is pushed to github.

# Other deployment steps

## Run on Medic OS

[What's Medic OS?](https://github.com/medic/medic-docs/blob/master/development/architecture.md#medic-os)

For development, you can find it useful to [run Medic OS on a VM](https://github.com/medic/medic-docs#setup-medic-os) locally, to leverage VM snapshots, for instance to work with different versions.

You can also use Medic-OS for production instances.

## Push the dashboard (optional)

[Garden Dashboard](https://github.com/garden20/dashboard) is used to download the couchapp onto a couchdb server, and later to update it.

If you just want to build and run locally for development, you don't need
Dashboard, because `grunt dev` will push the app to your local couchdb server.
If you want to download the app that someone else pushed to a Market, then you need Dashboard.

To install Dashboard, first change the CouchDB's `secure_rewrites` configuration
parameter to false:

```
curl -X PUT http://admin:pass@localhost:5986/_config/httpd/secure_rewrites \
  -d '"false"' -H "Content-Type: application/json"
```

Next, download, build, and push the dashboard application to CouchDB:

```
git clone https://github.com/garden20/dashboard
cd dashboard
git checkout develop
kanso install
kanso push http://admin:pass@localhost:5984/dashboard
```

Finally install our app in the dashboard.
- Go to [http://localhost:5984/dashboard/_design/dashboard/_rewrite/install](http://localhost:5984/dashboard/_design/dashboard/_rewrite/install)
- Type this in the input "https://staging.dev.medicmobile.org/markets-alpha/details/medic" and click next
- Follow the instructions to install the app

Now you've just overwritten your development installation so you probably want to do another `grunt dev` to overwrite it again.


## Deploy to Market (optional)

For your app to be accessible easily to other server instances, you can push it to an online Market.
Each instance, through its local Dashboard, will pull the app down.

When deploying to the market, include the sentinel package in the couchapp so
[gardener](https://github.com/garden20/gardener) can manage the process. This
is already automated in the CI scripts (and runs on Travis CI), but here is the
manual process:

First clone the repo recursively so you get both submodules `api` and
`sentinel`, then change directories:

```
git clone --depth=50 --recursive https://github.com/medic/medic-webapp
cd medic-webapp
```

Then edit `kanso.json`, and add `"kanso-gardener":null` to the end of the list
of dependencies.  You can use a text editor, or
[jsontool](https://github.com/trentm/json) has an edit mode that works:

```
cat kanso.json | json -e \
  'this.dependencies["kanso-gardener"] = null; this.dependencies_included = true;' \
    > new.json && \
mv new.json kanso.json
```

Finally, push to the [Medic Alpha
Market](https://staging.dev.medicmobile.org/markets-alpha/):

```sh
kanso push https://staging.dev.medicmobile.org/markets-alpha/upload
```

## Automated Deployment on Travis

Code is automatically deployed via [Travis CI](https://travis-ci.org/medic/medic-webapp) to the [Garden 2.0
Markets](https://github.com/garden20/garden-market) hosted at
[staging.dev](https://staging.dev.medicmobile.org/).  We maintain several markets
there for ease of testing and development, you can set your Garden Dashboard to
use any one of them.

The deployment is based on the following git tags and branches:

Market  | Branch/Tag
------------- | -------------
Alpha | master
Beta | tagged `n.n.n-beta.n`
RC | tagged `n.n.n-rc.n`
Release | tagged `0.n.n`
Release v2 | tagged `2.n.n`

## Help

Join our [Google Group](https://groups.google.com/forum/#!forum/medic-developers) or file an issue on Github. You can also post questions, and look for answers, on our [AnswerHub site](http://medicmobile.cloud.answerhub.com/).

## Build Status

Builds brought to you courtesy of [Travis CI](https://travis-ci.org/medic/medic-webapp).

[![Build Status](https://travis-ci.org/medic/medic-webapp.png?branch=master)](https://travis-ci.org/medic/medic-webapp/branches)

## License & Copyright

Copyright 2013-2015 Medic Mobile, Inc. <hello@medicmobile.org>

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
