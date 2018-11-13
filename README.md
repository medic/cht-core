# Medic Mobile

These instructions should help you get setup to run or develop on Medic Mobile.
For latest changes and release announcements see our [change log](Changes.md).

## Overview

Medic Mobile combines messaging, data collection, and analytics for health workers and health systems in hard-to-reach areas with or without internet connectivity.

The `medic-webapp` repository is the core tool of the Medic Mobile stack. When health workers submit data — using text messages (SMS), our mobile applications, or our SIM applications — the web app confirms data submission, generates unique IDs, and schedules automated reminder messages based on user-defined configurations. All information submitted by mobile users can be viewed, filtered, verified, and exported using the reports tab in the web application.

The web app is fully responsive with a mobile-first design, and supports localization using any written language. It can be installed locally, as part of a virtual machine (see [medic-os](https://github.com/medic/medic-os)), or in the cloud.

Currently, we functionally support the latest versions of Chrome, Chrome for Android and Firefox. We do not support Safari (unreliable implementations of web APIs we need) and the generic android browser (unreliable implementations in general). Our webapp code, which includes any code written as configuration, is still ES5. Our exact support matrix (including older app versions) can be found [in our docs](https://github.com/medic/medic-docs/blob/master/installation/supported-software.md).

For more information about Medic Mobile's tools, visit http://medicmobile.org/tools.
For more information about Medic Mobile's architecture and how the pieces fit together, see [Architecture Overview](https://github.com/medic/medic-docs/blob/master/development/architecture.md).
For more information about the format of docs in the database, see [Database Schema](https://github.com/medic/medic-docs/blob/master/development/db-schema.md).
For more information about the SMS exchange protocol between webapp and gateway, see [Message States](https://github.com/medic/medic-docs/blob/master/user/message-states.md).

## Easy local deployment

If you want to get up and running with no fuss, [you can use Horticulturalist](#deploy-locally-using-horticulturalist-beta).

If you want to use our standard configuration, [you can use the Medic Project Configurer](https://github.com/medic/medic-conf) in the [./config/standard](https://github.com/medic/medic-webapp/tree/master/config/standard) directory once Horticuluralist has successfully started.

If you want to develop against Medic, follow the Development Setup below.

## Development Setup

Before getting started, read about our [development workflow](https://github.com/medic/medic-docs/blob/master/development/workflow.md) and the [architecture overview](https://github.com/medic/medic-docs/blob/master/development/architecture.md).

The setup described below doesn't use [Medic OS](https://github.com/medic/medic-docs/blob/master/development/architecture.md#medic-os), the tools will be run directly on your machine.

### Dependencies

You will need to install the following:

[Node.js](https://nodejs.org) 8.11.x and above

[yarn](https://yarnpkg.com/en/) 1.7.0

[CouchDB](https://couchdb.apache.org) v2.x

### Setup CouchDB on a single node

NB: multiple CouchDB nodes will be more complicated, but the general pattern outlined below will be the same.

### Enabling a secure CouchDB

By default CouchDB runs in "admin party" mode, which means you do not need users to read or edit any data. This is great for some, but to use Medic safely we're going to disable this feature.

First, add an admin user. When prompted to create an admin during installation, use username:`admin` and password:`pass`. Passwords can be changed via [Fauxton](http://localhost:5984/_utils). For more information see the [CouchDB install doc](http://docs.couchdb.org/en/2.0.0/install/).

Now that's done, we must reconfigure CouchDB to require authentication:

```shell
curl -X PUT http://admin:pass@localhost:5986/_config/chttpd/require_valid_user \
  -d '"true"' -H "Content-Type: application/json"
```

Then create an actual admin user:

```shell
curl -X POST http://admin:pass@localhost:5984/_users \
  -H "Content-Type: application/json" \
  -d '{"_id": "org.couchdb.user:admin", "name": "admin", "password":"pass", "type":"user", "roles":[]}'
```

After following these steps CouchDB should no longer allow unauthorised access:

```shell
curl http://admin:pass@localhost:5984 # should work
{"couchdb":"Welcome","version":"2.0.0","vendor":{"name":"The Apache Software Foundation"}}
curl http://localhost:5984 # should fail
{"error":"unauthorized","reason":"Authentication required."}
```

To be able to use Fauxton with authenticated users:

```shell
curl -X PUT http://admin:pass@localhost:5986/_config/httpd/WWW-Authenticate \
  -d '"Basic realm=\"administrator\""' -H "Content-Type: application/json"
```

### Increasing `max_request_http_size`

Our application is larger than CouchDB's default request size, so we must increase it otherwise deployments may fail:

```shell
curl -X PUT --data '"4294967296"' http://admin:pass@localhost:5986/_config/httpd/max_http_request_size
```

## Build and run

### Build the webapp

```shell
git clone https://github.com/medic/medic-webapp
cd medic-webapp
yarn install
```

### Deploy all the apps

Create a `.env` file in the app directory with the following contents

```shell
COUCH_URL=http://admin:pass@localhost:5984/medic
COUCH_NODE_NAME=couchdb@localhost
```

Then install webapp, admin, api and sentinel dependencies

```shell
cd webapp && yarn install && cd ..
cd admin && yarn install && cd ..
cd api && yarn install && cd ..
cd sentinel && yarn install && cd ..
```

Then do an initial deploy of the webapp:

```shell
grunt dev-webapp
```

Once this is complete you can close it, and from now on you can just run:

```shell
yarn start
```

which will start the webapp, api, and sentinel, and watch for changes in each app.

### Deploy apps individually

If `yarn start` is not to your taste for whatever reason, the apps can be deployed individually.

#### Deploy the webapp

`grunt dev-webapp` will build and deploy the webapp, then watch for changes and redeploy when necessary.

#### Start medic-sentinel

```shell
cd sentinel
yarn install
export COUCH_NODE_NAME=couchdb@localhost
export COUCH_URL=http://admin:pass@localhost:5984/medic
```

Then run either `node ./server.js` from the sentinel directory or `grunt dev-sentinel` from the repository directory (which will watch for changes).

#### Start medic-api

```shell
cd api
yarn install
export COUCH_NODE_NAME=couchdb@localhost
export COUCH_URL=http://admin:pass@localhost:5984/medic
```

Then run either `node ./server.js` from the api directory or `grunt dev-api` from the repository directory (which will watch for changes).

### Try it out

Navigate your browser to [`http://localhost:5988/medic/login`](http://localhost:5988/medic/login).

### Data

To fill your app with generated data, you can batch-load messages from a CSV file, with the [load_messages.js](https://github.com/medic/medic-webapp/blob/master/scripts/load_messages.js) script.

Use `curl` to submit a single message:

```shell
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

They live in the `tests` directories of each app. Run them with grunt: `grunt unit-continuous`.

### End to End tests

They live in [tests](tests). To run them:

1. Update and start Webdriver: `yarn run webdriver`
2. Run tests: `grunt e2e`

### API integration tests

`grunt api-e2e`

### Integration tests

[Travis](https://travis-ci.org/medic/medic-webapp) runs `grunt ci` every time some new code is pushed to github.

## Other deployment steps

### Deploy locally using Horticulturalist (beta)

[Horticulturalist](https://github.com/medic/horticulturalist) is an easy way to deploy Medic locally if you're not going to be developing against it.

Horti is currently in beta, and will eventually replace the Market, Gardener and Dashboard as our standard way to deploy and manage our software.

To use it locally:

- Install, [configure](#setup-couchdb-on-a-single-node) and [secure](#enabling-a-secure-couchdb) CouchDB
- Install [npm](https://npms.io/)
- Install Horticulturalist with `npm install -g horticulturalist`

Now use the `horti` tool to bootstrap Medic and launch it:

```shell
COUCH_NODE_NAME=couchdb@localhost COUCH_URL=http://admin:pass@localhost:5984/medic horti --local --bootstrap
```

This will download, configure and install the latest Master build of medic. If you're looking to deploy a specific version, provide it to the `bootstrap` command:

```shell
COUCH_NODE_NAME=couchdb@localhost COUCH_URL=http://admin:pass@localhost:5984/medic horti --local --bootstrap=3.0.0-beta.1
```

To kill Horti hit CTRL+C. To start Horti (and Medic) again, run the same command as above, but this time don't bootstrap:

```shell
COUCH_NODE_NAME=couchdb@localhost COUCH_URL=http://admin:pass@localhost:5984/medic horti --local
```

If you wish to change the version of Medic installed, you can either bootstrap again, or use the [Instance Upgrade configuration screen](http://localhost:5988/medic/_design/medic/_rewrite/#/configuration/upgrade).'

**NB**: Horticulturalist doesn't wipe your database when it bootstraps, it just installs the provided version (or master) over whatever you already have. To completely start again, stop Horti and delete the `medic` database, either using Futon / Fauxton, or from the command line:

```shell
curl -X DELETE $COUCH_URL
```
## Configuring Medic

We ship with one "standard" configuration, which can be a useful basis to start with. It is located at [./config/standard[(https://github.com/medic/medic-webapp/tree/master/config/standard).

Configuration is performed using [Medic Project Configurer](https://github.com/medic/medic-conf). `medic-conf` expects a particular structure (seen in the standard config above). It compiles forms and configuration into the required formats, as well as uploading that configuration and performing other tasks.

## Automated Deployment on Travis

Code is automatically published via [Travis CI](https://travis-ci.org/medic/medic-webapp) to the [staging server](https://staging.dev.medicmobile.org).

## Help

Join our [Google Group](https://groups.google.com/forum/#!forum/medic-developers) or file an issue on Github. You can also post questions, and look for answers, on our [AnswerHub site](http://medicmobile.cloud.answerhub.com/).

## Contributing

At Medic Mobile we welcome and appreciate community contributions. If you have an idea or a question we'd love to hear from you! The easiest ways to get in touch are by raising issues in the [medic-webapp Github repo](https://github.com/medic/medic-webapp/issues) or by messaging our [Google Group](https://groups.google.com/forum/#!forum/medic-developers). For more info check out our [contributor guidelines](CONTRIBUTING.md).

## Build Status

Builds brought to you courtesy of [Travis CI](https://travis-ci.org/medic/medic-webapp).

[![Build Status](https://travis-ci.org/medic/medic-webapp.png?branch=master)](https://travis-ci.org/medic/medic-webapp/branches)

## Copyright

Copyright 2013-2018 Medic Mobile, Inc. <hello@medicmobile.org>

## License

The software is provided under AGPL-3.0. Contributions to this project are accepted under the same license.
