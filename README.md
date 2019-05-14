# Medic Mobile

These instructions should help you get setup to run or develop on Medic Mobile's Community Health Application Framework. For latest changes and release announcements see our [release notes](https://github.com/medic/medic/tree/master/release-notes).

If you are interested in building community health applications using this framework a good place to start is the guide for [developing community health apps](https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md).

## Overview

Medic Mobile combines messaging, data collection, and analytics for health workers and health systems in hard-to-reach areas with or without internet connectivity.

The `medic` repository is the core tool of the Medic Mobile stack. When health workers submit data — using text messages (SMS), our mobile applications, or our SIM applications — the web app confirms data submission, generates unique IDs, and schedules automated reminder messages based on user-defined configurations. All information submitted by mobile users can be viewed, filtered, verified, and exported using the reports tab in the web application.

The web app is fully responsive with a mobile-first design, and supports localization using any written language. It can be installed locally or in the cloud by setting up the individual components or as a Docker container.

Currently, we functionally support the latest versions of Chrome, Chrome for Android and Firefox. We do not support Safari (unreliable implementations of web APIs we need) and the generic android browser (unreliable implementations in general). Our webapp code, which includes any code written as configuration, is still ES5. Our exact support matrix (including older app versions) can be found [in our docs](https://github.com/medic/medic-docs/blob/master/installation/supported-software.md).

For more information about Medic Mobile's tools, visit http://medicmobile.org/tools.
For more information about Medic Mobile's architecture and how the pieces fit together, see [Architecture Overview](https://github.com/medic/medic-docs/blob/master/development/architecture.md).
For more information about the format of docs in the database, see [Database Schema](https://github.com/medic/medic-docs/blob/master/development/db-schema.md).
For more information about the SMS exchange protocol between webapp and gateway, see [Message States](https://github.com/medic/medic-docs/blob/master/user/message-states.md).

## Easy Deployment

If you want to get up and running with no fuss, [you can use Docker](https://github.com/medic/medic-docs/blob/master/installation/public-docker-image-setup.md).

Once up and running you can [create your own custom application](https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md), or set up the standard application by running [the Medic Configurer](https://github.com/medic/medic-conf) on the [./config/standard](https://github.com/medic/medic/tree/master/config/standard) directory.

If you want to develop against the underlying framework of Medic and set up components individually, follow the _Development Setup_ below.

## Development Setup

Before getting started, read about our [development workflow](https://github.com/medic/medic-docs/blob/master/development/workflow.md) and the [architecture overview](https://github.com/medic/medic-docs/blob/master/development/architecture.md).

With the setup instructions below the tools will run directly on your machine, rather than via Docker.

### Dependencies

You will need to install the following:

- [Node.js](https://nodejs.org) 8.11.x and above
- [npm](https://npmjs.com/) 6.x.x and above (to support npm ci)
- [CouchDB](https://couchdb.apache.org) v2.x

### Setup CouchDB on a single node

NB: multiple CouchDB nodes will be more complicated, but the general pattern outlined below will be the same.

### Enabling a secure CouchDB

By default CouchDB runs in "admin party" mode, which means you do not need users to read or edit any data. This is great for some, but to use Medic safely we're going to disable this feature.

First, add an admin user. When prompted to create an admin during installation, use a strong username and password. Passwords can be changed via [Fauxton](http://localhost:5984/_utils). For more information see the [CouchDB install doc](http://docs.couchdb.org/en/2.0.0/install/). 

Now that's done, we must configure some security settings on CouchDB:

```shell
COUCH_URL=http://myAdminUser:myAdminPass@localhost:5984/medic
COUCH_NODE_NAME=couchdb@127.0.0.1
grunt secure-couchdb
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

## Build and run

### Build the webapp

```shell
git clone https://github.com/medic/medic
cd medic
npm ci
```

### Deploy all the apps

Create a `.env` file in the app directory with the following contents

```shell
COUCH_URL=http://myAdminUser:myAdminPass@localhost:5984/medic
COUCH_NODE_NAME=couchdb@127.0.0.1
```

Then do an initial deploy of the webapp:

```shell
grunt dev-webapp
# or just
grunt
```

Once this is complete you can close it, and from now on you can just run:

```shell
npm start
```

which will start the webapp, api, and sentinel, and watch for changes in each app.

### Deploy apps individually

If `npm start` is not to your taste for whatever reason, the apps can be deployed individually.

#### Deploy the webapp

`grunt dev-webapp` will build and deploy the webapp, then watch for changes and redeploy when necessary.

#### Start medic-sentinel

```shell
cd sentinel
npm ci
export COUCH_NODE_NAME=couchdb@127.0.0.1
export COUCH_URL=http://myAdminUser:myAdminPass@localhost:5984/medic
```

Then run either `node ./server.js` from the sentinel directory or `grunt dev-sentinel` from the repository directory (which will watch for changes).

#### Start medic-api

```shell
cd api
npm ci
export COUCH_NODE_NAME=couchdb@127.0.0.1
export COUCH_URL=http://myAdminUser:myAdminPass@localhost:5984/medic
```

Then run either `node ./server.js` from the api directory or `grunt dev-api` from the repository directory (which will watch for changes).

### Try it out

Navigate your browser to [`http://localhost:5988/medic/login`](http://localhost:5988/medic/login).

### Testing locally with devices 

Follow the steps below to use an Android device with a development build of your application. This process is relevant when running v3.5.0 or greater of the Community Health Application Framework since it relies on service workers, which requires a valid HTTPS certificate. These steps will make your developer build accessible from your Android device by giving it a trusted URL created by _ngrok_.

1. Create a ngrok account at https://ngrok.com/ 
1. Follow instructions on downloading and linking your computer to your ngrok account.
1. Start the webapp. This can be via docker, grunt, debug, horti, etc....
1. Run ngrok and forward it towards the port you are running the webapp on.
    * EX: For running webapp in docker locally using the docker instructions above `$ ./ngrok http 443`. This will forward the traffic from your ngrok url on https to 443 on your local machine. </br>
    * EX: For running via horti, or grunt where the api starts on port 5988. `$ ./ngrok http 5988` This will forward the traffic from your ngrok url on https to 5988 on your local machine.
    * Example output from ngrok: Forwarding https://1661304e.ngrok.io -> http://localhost:5988 
1. You can then enter the ngrok generated url(https://1661304e.ngrok.io) into our [android app](https://github.com/medic/medic-android) or browser and connect to your local dev environment.                


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

## Configuring Medic

This app is highly configurable and can be modified to suit your needs. Read the guide for [developing community health applications](https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md) if you would like to customize your application further. 

We include the "standard" configuration in this repo, which can be a useful basis to start with. It is located at [./config/standard](https://github.com/medic/medic/tree/master/config/standard). 

Configuration is performed using [Medic Configurer](https://github.com/medic/medic-conf). `medic-conf` expects a particular structure (seen in the standard config above). It compiles forms and configuration into the required formats, as well as uploading that configuration and performing other tasks.

To import the standard configuration:

1. Install medic-conf: `npm install -g medic-conf`
2. Navigate to the configuration you want to import: `cd <medic-repo>/config/standard`
1. Ensure the app/api is running. Specifically on localhost for these instructions. 
3. Import the config: `medic-conf --url=http://username:password@localhost:5988`

## Automated Deployment on Travis

Code is automatically published via [Travis CI](https://travis-ci.org/medic/medic) to the [staging server](https://staging.dev.medicmobile.org).

## Contributing

At Medic Mobile we are the technical steward of the [Community Health Toolkit](https://communityhealthtoolkit.org). We welcome and appreciate contributions, and support new developers to use the tools whenever possible. If you have an idea or a question we'd love to hear from you! The easiest ways to get in touch are by raising issues in the [medic Github repo](https://github.com/medic/medic/issues) or [joining our Slack channel](https://communityhealthtoolkit.org/slack). For more info check out our [contributor guidelines](CONTRIBUTING.md).

## Build Status

Builds brought to you courtesy of [Travis CI](https://travis-ci.org/medic/medic).

[![Build Status](https://travis-ci.org/medic/medic.png?branch=master)](https://travis-ci.org/medic/medic/branches)

## Copyright

Copyright 2013-2018 Medic Mobile, Inc. <hello@medicmobile.org>

## License

The software is provided under AGPL-3.0. Contributions to this project are accepted under the same license.
