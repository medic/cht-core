# Development Setup

These instructions are for developers who want to contribute to the Core Framework (this repository). If you only need to run the Framework (ie with a Reference App configuration), or you are a developer building configurations, you can follow the [easy deployment instructions](./INSTALL.md) instead.

Before getting started, read about our [development workflow](https://github.com/medic/medic-docs/blob/master/development/workflow.md) and the [architecture overview](https://github.com/medic/medic-docs/blob/master/development/architecture.md). With the setup instructions below the tools will run directly on your machine, rather than via Docker.

## Supported Operating Systems

Developers are actively using both Linux and MacOS, so both of those platforms are well supported for development. We don't support Windows out of the box. However, you can try using the Windows Subsystem for Linux. See the [Windows Subsystem for Linux notes](https://github.com/medic/medic-docs/blob/master/development/using-windows.md) for how the installation instructions differ.

## Dependencies

You will need to install the following:

- [Node.js](https://nodejs.org) 8.11.x and above
- [npm](https://npmjs.com/) 6.x.x and above (to support npm ci)
- [grunt cli](https://gruntjs.com/using-the-cli)
- [CouchDB](https://couchdb.apache.org) 2.x ([installation instructions](http://docs.couchdb.org/en/2.3.1/install/index.html)). If on a Mac, please note that installation via homebrew is **not** supported.
- xsltproc
- python 2.7

To run end-to-end tests you will also need:

- Java JDK
- Docker

Installation instructions for these tools differ heavily based on your operating system and aren't covered here.

## Setup CouchDB on a single node

NB: multiple CouchDB nodes will be more complicated, but the general pattern outlined below will be the same.

## Build the webapp

```shell
git clone https://github.com/medic/cht-core
cd cht-core
npm ci
```

## Enabling a secure CouchDB

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

## Required environment variables

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

### Deploy the webapp

Webapp code is stored in CouchDB. To compile and deploy the current code, use `grunt`:

```sh
grunt
```

This will also watch for changes and redeploy as neccessary.

### Start medic-api

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

### Start medic-sentinel

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

## Try it out

Navigate your browser to [`http://localhost:5988/medic/login`](http://localhost:5988/medic/login).

## Testing locally with devices

Follow the steps below to use an Android device with a development build of your application. This process is relevant when running v3.5.0 or greater of the Core Framework since it relies on service workers, which requires a valid HTTPS certificate. Use either `serveo` or `ngrok` to make your developer build accessible from your Android device by giving it a trusted URL.

1. Start the api. This can be via docker, grunt, debug, horti, etc.
2. Follow the instructions below to start serveo (preferred) or ngrok
3. This will output a generated URL which you can enter into our [android app](https://github.com/medic/medic-android) or browser and connect to your local dev environment.

### serveo

Proxying via serveo is generally more successful than ngrok so it is our preferred route. Sometimes it will be blocked by Chrome safe browsing however in which case you can try ngrok.

* To connect to an API running via `grunt` or `horti`, execute `ssh -R 80:localhost:5988 serveo.net`
* To connect to an API running via `Docker`, execute `ssh -R 80:localhost:443 serveo.net`

This will echo a URL which you can connect to.

### ngrok

ngrok sometimes fails due to connection throttling which can cause the service worker cache preload to fail. It's included here as an alternative in case serveo doesn't work for some reason.

1. Create a ngrok account at https://ngrok.com/
1. Follow instructions on downloading and linking your computer to your ngrok account.
1. Start ngrok
    * To connect to an API running via `grunt` or `horti`, execute `./ngrok http 5988`
    * To connect to an API running via `Docker`, execute `./ngrok http 443`
1. Access the app using the https address shown, eg https://123456.ngrok.io

## Data

To fill your app with generated data, you can batch-load messages from a CSV file, with the [load_messages.js](https://github.com/medic/cht-core/blob/master/scripts/load_messages.js) script.

Use `curl` to submit a single message:

```shell
curl -i -u gateway:123qwe \
    --data-urlencode 'message=Test One two' \
    --data-urlencode 'from=+13125551212' \
    --data-urlencode 'sent_timestamp=1403965605868' \
    -X POST \
    http://localhost:5988/api/v1/records
```

## Localization

All text labels in the app are localized. See the [translation documentation](https://github.com/medic/medic-docs/blob/master/development/translations.md) for more details on how to add new labels or modify existing ones.

# Tests

Check out the [Gruntfile](Gruntfile.js) for all the tests you can run.

## Unit tests

They live in the `tests` directories of each app. Run them with grunt: `grunt unit-continuous`.

## End to End tests

They live in [tests](tests). Run them with grunt: `grunt e2e`. Docker is required (it should be available on the command line as `docker`).

## API integration tests

`grunt api-e2e`

## Integration tests

[Travis](https://travis-ci.org/medic/medic) runs `grunt ci` every time some new code is pushed to github.

## Build documentation

To build reference documentation into a local folder `jsdoc-docs`: `grunt build-documentation`

# Automated Deployment on Travis

Code is automatically published via [Travis CI](https://travis-ci.org/medic/medic) to the [staging server](https://staging.dev.medicmobile.org).
