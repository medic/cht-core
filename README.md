# The Core Framework of the Community Health Toolkit (CHT)

These instructions are designed to help you run or develop on the Core Framework, a technical resource of the [Community Health Toolkit (CHT)](https://communityhealthtoolkit.org) contributed by Medic Mobile. 

Medic Mobile is a nonprofit organization on a mission to improve health in the hardest-to-reach communities through open-source software. Medic Mobile serves as the technical steward of the Community Health Toolkit.

For the latest changes and release announcements see our [release notes](https://github.com/medic/medic/tree/master/release-notes). Our exact support matrix (including older app versions) can be found [in our docs](https://github.com/medic/medic-docs/blob/master/installation/supported-software.md).


## Table of Contents

  - [Overview](#overview)
  - [Easy deployment](#easy-deployment)
  - [Development setup](#development-setup)
  - [Tests](#tests)
  - [Configuring the standard application](#configuring-the-standard-application)
  - [Contributing](#contributing)
  - [License](#license)

## Overview

The CHT's Core Framework is a software architecture that makes it faster to build full-featured, scalable digital health apps that equip health workers to provide better care in their communities. To learn more about building an application with the Core Framework, visit our guide for [developing community health apps](https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md). 

The Core Framework addresses complexities like health system roles and reporting hierarchies, and its features are flexible enough to support a range of health programs and local care provider workflows.  

Mobile and web applications built with the Core Framework support a team-based approach to healthcare delivery and management. Health workers can use SMS messages or mobile applications to submit health data that can then be viewed and exported using a web application. These web applications are fully responsive with a mobile-first design, and support localization using any written language. They can be installed locally or in the cloud by setting up the individual components or as a Docker container. 

For more information about Medic Mobile's architecture and how the pieces fit together, see [Architecture Overview](https://github.com/medic/medic-docs/blob/master/development/architecture.md).
For more information about the format of docs in the database, see [Database Schema](https://github.com/medic/medic-docs/blob/master/development/db-schema.md).
For more information about the SMS exchange protocol between webapp and gateway, see [Message States](https://github.com/medic/medic-docs/blob/master/user/message-states.md).

## Easy Deployment

To get up and running quickly, [you can use Docker](https://github.com/medic/medic-docs/blob/master/installation/public-docker-image-setup.md). You can then [create your own custom application](https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md), or set up the standard application by running [the Medic Configurer](https://github.com/medic/medic-conf) on the [./config/standard](https://github.com/medic/medic/tree/master/config/standard) directory.


## Development Setup

Before getting started, read about our [development workflow](https://github.com/medic/medic-docs/blob/master/development/workflow.md) and the [architecture overview](https://github.com/medic/medic-docs/blob/master/development/architecture.md). With the setup instructions below the tools will run directly on your machine, rather than via Docker.

### Supported Operating Systems

Developers are actively using both Linux and MacOS, so both of those platforms are well supported for development. We don't support Windows out of the box. However, you can try using the Windows Subsystem for Linux. See the [Windows Subsystem for Linux notes](https://github.com/medic/medic-docs/blob/master/development/using-windows.md) for how the installation instructions differ.

### Supported Browsers

Currently, the latest versions of Chrome, Chrome for Android and Firefox are functionally supported. We do not support Safari (unreliable implementations of necessary web APIs) and the generic android browser (unreliable implementations in general). Our webapp code, which includes any code written as configuration, is still ES5. Our exact support matrix (including older app versions) can be found [in our docs](https://github.com/medic/medic-docs/blob/master/installation/supported-software.md).

### Dependencies

You will need to install the following:

- [Node.js](https://nodejs.org) 8.11.x and above
- [npm](https://npmjs.com/) 6.x.x and above (to support npm ci)
- [grunt cli](https://gruntjs.com/using-the-cli)
- [CouchDB](https://couchdb.apache.org) 2.x
- python 2.7
- Java JDK (for running end-to-end tests only)

### Setup CouchDB on a single node

NB: multiple CouchDB nodes will be more complicated, but the general pattern outlined below will be the same.

### Build the webapp

```shell
git clone https://github.com/medic/medic
cd medic
npm ci
```

### Enabling a secure CouchDB

By default CouchDB runs in *admin party mode*, which means you do not need users to read or edit any data. This is great for some, but to use your application safely we're going to disable this feature.

First, add an admin user. When prompted to create an admin during installation, use a strong username and password. Passwords can be changed via [Fauxton](http://localhost:5984/_utils). For more information see the [CouchDB install doc](http://docs.couchdb.org/en/2.0.0/install/).

Now, configure some security settings on CouchDB:

```shell
COUCH_URL=http://myAdminUser:myAdminPass@localhost:5984/medic COUCH_NODE_NAME=couchdb@127.0.0.1 grunt secure-couchdb
```

After following these steps CouchDB should no longer allow unauthorised access:
 ```shell
curl http://myAdminUser:myAdminPass@localhost:5984 # should work
{"couchdb":"Welcome","version":"2.0.0","vendor":{"name":"The Apache Software Foundation"}}
curl http://localhost:5984 # should fail
{"error":"unauthorized","reason":"Authentication required."}
```

To be able to use Fauxton with authenticated users:

```shell
curl -X PUT "http://myAdminUser:myAdminPass@localhost:5984/_node/$COUCH_NODE_NAME/_config/httpd/WWW-Authenticate" \
  -d '"Basic realm=\"administrator\""' -H "Content-Type: application/json"
```

### Required environment variables

Medic needs the following environment variables to be declared:
 - `COUCH_URL`: the full authenticated url to the `medic` DB. Locally this would be  `http://myAdminUser:myAdminPass@localhost:5984/medic`
 - `COUCH_NODE_NAME`: the name of your CouchDB's node. This is likely to either be `couchdb@127.0.0,1` or `noname@nohost`. You can find out by querying [CouchDB's membership API](https://docs.couchdb.org/en/stable/api/server/common.html#membership)
 - (optionally) `API_PORT`: the port API will run on. If not defined we use `5988`
 - (optionally) `CHROME_BIN`: only required if `grunt unit` or `grunt e2e` complain that they can't find Chrome.

How to permanently define environment variables depends on your OS and shell (e.g. for bash you can put them `~/.bashrc`). You can temporarily define them with `export`:

```sh
export COUCH_NODE_NAME=couchdb@127.0.0.1
export COUCH_URL=http://myAdminUser:myAdminPass@localhost:5984/medic
```

#### Deploy the webapp

Webapp code is stored in CouchDB. To compile and deploy the current code, use `grunt`:

```sh
grunt
```

This will also watch for changes and redeploy as neccessary.

#### Start medic-api

API is needed to access the application.

Either start it directly with `node`:

```sh
cd ./api
node server.js
```

Or use `grunt` to have it watch for changes and restart as neccessary:

```sh
grunt dev-api
```

#### Start medic-sentinel

Sentinel is reponsible for certain background tasks. It's not strictly required to access the application, but many features won't work without it.

Either start it directly with `node`:

```sh
cd ./sentinel
node server.js
```

Or use `grunt` to have it watch for changes and restart as neccessary:

```sh
grunt dev-sentinel
```

### Try it out

Navigate your browser to [`http://localhost:5988/medic/login`](http://localhost:5988/medic/login).

### Testing locally with devices

Follow the steps below to use an Android device with a development build of your application. This process is relevant when running v3.5.0 or greater of the Core Framework since it relies on service workers, which requires a valid HTTPS certificate. Use either `serveo` or `ngrok` to make your developer build accessible from your Android device by giving it a trusted URL.

1. Start the api. This can be via docker, grunt, debug, horti, etc.
2. Follow the instructions below to start serveo (preferred) or ngrok
3. This will output a generated URL which you can enter into our [android app](https://github.com/medic/medic-android) or browser and connect to your local dev environment.

#### serveo

Proxying via serveo is generally more successful than ngrok so it is our preferred route. Sometimes it will be blocked by Chrome safe browsing however in which case you can try ngrok.

* To connect to an API running via `grunt` or `horti`, execute `ssh -R 80:localhost:5988 serveo.net`
* To connect to an API running via `Docker`, execute `ssh -R 80:localhost:443 serveo.net`

This will echo a URL which you can connect to.

#### ngrok

ngrok sometimes fails due to connection throttling which can cause the service worker cache preload to fail. It's included here as an alternative in case serveo doesn't work for some reason.

1. Create a ngrok account at https://ngrok.com/
2. Follow instructions on downloading and linking your computer to your ngrok account.
3. Start ngrok
  * To connect to an API running via `grunt` or `horti`, execute `./ngrok http 5988`
  * To connect to an API running via `Docker`, execute `./ngrok http 443`

### Data

To fill your app with generated data, you can batch-load messages from a CSV file, with the [load_messages.js](https://github.com/medic/medic/blob/master/scripts/load_messages.js) script.

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

They live in [tests](tests). Run them with grunt: `grunt e2e`.

### API integration tests

`grunt api-e2e`

### Integration tests

[Travis](https://travis-ci.org/medic/medic) runs `grunt ci` every time some new code is pushed to github.

### Build documentation

To build reference documentation into a local folder `jsdoc-docs`: `grunt build-documentation`

## Configuring the standard application

This app is highly configurable and can be modified to suit your needs. Read the guide for [developing community health applications](https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md) if you would like to customize your application further.

This repo includes a standard configuration as a useful starting point. It is located at [./config/standard](https://github.com/medic/medic/tree/master/config/standard). 

Configuration is performed using [Medic Configurer](https://github.com/medic/medic-conf). `medic-conf` expects a particular structure (seen in the standard config above). It compiles forms and configuration into the required formats, as well as uploading that configuration and performing other tasks.

To import the standard configuration:

1. Install medic-conf: `npm install -g medic-conf`
2. Navigate to the configuration you want to import: `cd <medic-repo>/config/standard`
1. Ensure the app/api is running. Specifically on localhost for these instructions.
3. Import the config: `medic-conf --url=http://username:password@localhost:5988`

## Automated Deployment on Travis

Code is automatically published via [Travis CI](https://travis-ci.org/medic/medic) to the [staging server](https://staging.dev.medicmobile.org).

## Contributing

The Core Framework of the [Community Health Toolkit](https://communityhealthtoolkit.org) is powered by people like you. We appreciate your contributions, and are dedicated to supporting the developers who improve our tools whenever possible. 

First time contributor? Issues labeled [help wanted](https://github.com/medic/medic/labels/Help%20wanted) are a great place to start. 

Looking for other ways to help? You can also:
* Improve documentation. Check out our style guide [here](https://github.com/medic/medic-docs/blob/master/development/docs-style-guide.md)
* Find and mark duplicate issues
* Try to reproduce issues and help with troubleshooting
* Or share a new idea or question with us!

The easiest ways to get in touch are by raising issues in the [medic Github repo](https://github.com/medic/medic/issues) or [joining our Slack channel](https://communityhealthtoolkit.org/slack). You can even [request access](mailto:info@communityhealthtoolkit.org) to our community forum. 

For more information check out our [contributor guidelines](CONTRIBUTING.md).

## Build Status

Builds brought to you courtesy of [Travis CI](https://travis-ci.org/medic/medic).

[![Build Status](https://travis-ci.org/medic/medic.png?branch=master)](https://travis-ci.org/medic/medic/branches)

## Copyright

Copyright 2013-2018 Medic Mobile, Inc. <hello@medicmobile.org>

## License

The software is provided under AGPL-3.0. Contributions to this project are accepted under the same license.
