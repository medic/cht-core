# Development Setup

These instructions are for developers who want to contribute to the Core Framework (this repository). If you only need to run the Framework (ie with a Reference App configuration), or you are a developer building configurations, you can follow the [easy deployment instructions](./INSTALL.md) instead.

Before getting started, read about our [development workflow](https://docs.communityhealthtoolkit.org/contribute/code/workflow/) and the [architecture overview](https://docs.communityhealthtoolkit.org/core/overview/architecture/). With the setup instructions below the tools will run directly on your machine, rather than via Docker.

## Supported Operating Systems

Developers are actively using both Linux and MacOS, so both of those platforms are well supported for development. We don't support Windows out of the box. However, you can try [using the Windows Subsystem for Linux](https://docs.communityhealthtoolkit.org/core/guides/using-windows/).

## Dependencies

You will need to install the following:

- [Node.js](https://nodejs.org) 8.11.x and above LTS release (designated with an even major version number)
- [npm](https://npmjs.com/) 6.x.x and above (to support npm ci)
- [grunt cli](https://gruntjs.com/using-the-cli)
- [CouchDB](https://couchdb.apache.org) 2.x ([installation instructions](http://docs.couchdb.org/en/2.3.1/install/index.html)). For simplicity we [recommend installing via docker](#couchdb-on-docker). If on a Mac, please note that installation via homebrew is **not** supported.
- xsltproc
- python 2.7

To run end-to-end tests you will also need:

- Java JDK
- Docker

Installation instructions for these tools differ heavily based on your operating system and aren't covered here.

### CouchDB on Docker

We recommend using Docker to install and use CouchDB. This ensures you are getting a compatible version and not relying on OS packages that haven't been tested with this project yet.

After [installing docker](https://docs.docker.com/get-docker/), you can create a docker container like so:

```sh
docker run -d -p 5984:5984 -p 5986:5986 --name medic-couchdb -e COUCHDB_USER=myAdminUser -e COUCHDB_PASSWORD=myAdminPass --rm -v <data path>:/opt/couchdb/data -v <config path>:/opt/couchdb/etc/local.d apache/couchdb:2
```

Notes before copy pasting:
 - `--name` creates a container called `medic-couchdb`. You can name it whatever you want, but this is how you refer to it later
 - `-e` sets an environment variable inside the container. Two are set here, for a user and password for the initial admin user.
 - `-v` maps where couchdb stores data to your local file system to ensure persistence without depending on the container, using the path *before* the `:` (the path after the colon is the internal path inside the docker image). This should be somewhere you have write access to, and want this data to be stored. The second mounted volume is for the couch configuration, which will retain settings if your container is removed. This is especially important after running the command to secure the instance (done in steps below).
 - `apache/couchdb:2` will install the latest package for CouchDB 2.x

Once this downloads and starts, you will need to [initialise CouchDB](http://localhost:5984/_utils/#/setup) as noted in [their install instructions](https://docs.couchdb.org/en/2.3.1/setup/index.html#setup).

You can use `docker stop medic-couchdb` to stop it and `docker start medic-couchdb` to start it again. Remember that you'll need to start it whenever you restart your OS, which might not be the case if you use a normal OS package.

Medic recommends you familiarise yourself with other Docker commands to make docker image and container management clearer.

## Required environment variables

Medic needs the following environment variables to be declared:
 - `COUCH_URL`: the full authenticated url to the `medic` DB. Locally this would be  `http://myAdminUser:myAdminPass@localhost:5984/medic`
 - `COUCH_NODE_NAME`: the name of your CouchDB's node. The Docker image default is `nonode@nohost`. Other installations may use `couchdb@127.0.0,1`. You can find out by querying [CouchDB's membership API](https://docs.couchdb.org/en/stable/api/server/common.html#membership)
 - (optionally) `API_PORT`: the port API will run on. If not defined we use `5988`
 - (optionally) `CHROME_BIN`: only required if `grunt unit` or `grunt e2e` complain that they can't find Chrome.

How to permanently define environment variables depends on your OS and shell (e.g. for bash you can put them `~/.bashrc`). You can temporarily define them with `export`:

```sh
export COUCH_NODE_NAME=nonode@nohost
export COUCH_URL=http://myAdminUser:myAdminPass@localhost:5984/medic
```

## Build the webapp

```shell
git clone https://github.com/medic/cht-core
cd cht-core
npm ci
```

## Enabling a secure CouchDB

By default CouchDB runs in *admin party mode*, which means you do not need users to read or edit any data. This is great for some, but to use your application safely we're going to disable this feature.

First, add an admin user (unless you did via the docker `-e` switches as described above). When prompted to create an admin [during installation](https://docs.couchdb.org/en/2.3.1/setup/index.html#setup), use a strong username and password. Passwords can be changed via [Fauxton](http://localhost:5984/_utils). For more information see the [CouchDB install doc](http://docs.couchdb.org/en/2.3.1/install/).

Once you have an admin user you can proceed with securing CouchDB:

```shell
COUCH_URL=http://myAdminUser:myAdminPass@localhost:5984/medic COUCH_NODE_NAME=nonode@nohost grunt secure-couchdb
```

At this point, CouchDB should block unauthorised access:
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

## Deploying CHT-Core

There are three steps to getting cht-core up and running.

### Deploying the web app

Webapp code is stored in CouchDB. To compile and deploy the current code, use `grunt`:

```sh
grunt
```

This will also watch for changes and redeploy as necessary.

### Start medic-api

API is needed to access the application.

Either start it directly with `node`:

```sh
cd ./api
node server.js
```

Or use `grunt` to have it watch for changes and restart as necessary:

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

Or use `grunt` to have it watch for changes and restart as necessary:

```sh
grunt dev-sentinel
```

## Try it out

Navigate your browser to [`http://localhost:5988/medic/login`](http://localhost:5988/medic/login).

## Testing locally with devices

Follow the steps below to use an Android device with a development build of your application. This process is relevant when running v3.5.0 or greater of the Core Framework since it relies on service workers, which requires a valid HTTPS certificate. Use `ngrok` or `pagekite` to make your developer build accessible from your Android device by giving it a trusted URL.

1. Start the api. This can be via docker, grunt, debug, horti, etc.
2. Follow the instructions below to start ngrok or pagekite
3. This will output a generated URL which you can enter into our [android app](https://github.com/medic/medic-android) or browser and connect to your local dev environment.

### ngrok

1. Create a ngrok account at https://ngrok.com/
1. Follow instructions on downloading and linking your computer to your ngrok account.
1. Start ngrok
    * To connect to an API running via `grunt` or `horti`, execute `./ngrok http 5988`
    * To connect to an API running via `Docker`, execute `./ngrok http 443`
1. Access the app using the https address shown, eg https://YOUR-NGROK-NAME.ngrok.io, replacing `YOUR-NGROK-NAME` with what you signed up with.

**Note:** ngrok sometimes fails due to connection throttling which can cause the service worker cache preload to fail.

### pagekite

1. Create a pagekite account at https://pagekite.net/signup/
1. Follow instructions on downloading the python script for pagekite
1. Start pagekite (be sure to replace `YOUR-PAGEKIT-NAME` with the URL you signed up for:
    * To connect to an API running via `grunt` or `horti`, execute `python2 pagekite.py 5988 YOUR-PAGEKIT-NAME.pagekite.me`
    * To connect to an API running via `Docker`, execute `python2 pagekite.py 443 YOUR-PAGEKIT-NAME.pagekite.me`
1. Access the app using the https address shown, eg https://YOUR-PAGEKIT-NAME.pagekite.me


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

All text labels in the app are localized. See the [translation documentation](https://docs.communityhealthtoolkit.org/core/overview/translations/) for details on how to add new labels or modify existing ones.

# Tests

Check out the [Gruntfile](Gruntfile.js) for all the tests you can run.

## Unit tests

They live in the `tests` directories of each app. Run them with grunt: `grunt unit-continuous`.

## End to End tests

They live in [tests](tests). Run them with grunt: `grunt e2e-web` for web tests,`grunt e2e-mobile` for mobile resolution or `grunt e2e` for all e2e tests.  Docker is required (it should be available on the command line as `docker`).

## API integration tests

`grunt api-e2e`

## Integration tests

[Travis](https://travis-ci.org/github/medic/cht-core) runs `grunt ci` every time some new code is pushed to github.

## Build documentation

To build reference documentation into a local folder `jsdoc-docs`: `grunt build-documentation`

# Automated Deployment on Travis

Code is automatically published via [Travis CI](https://travis-ci.org/github/medic/cht-core) to the [staging server](https://staging.dev.medicmobile.org).
