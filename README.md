# Medic Mobile

These instructions should help you get setup to run or develop on Medic Mobile.
For latest changes and release announcements see the [change log](Changes.md).

## Dependencies

You will need to install the following:

[Nodejs](http://nodejs.org)

[CouchDB](http://couchdb.apache.org)

[couchdb-lucene](https://github.com/rnewson/couchdb-lucene) v1.0.2 or greater

### Setup CouchDB


Setup admin access
```
curl -X PUT http://localhost:5984/_config/admins/admin -d '"pass"'
```
In CouchDB's local.ini, force authentication
```
[couch_httpd_auth]
require_valid_user = true
```
Create an admin user
```
curl -X POST http://admin:pass@localhost:5984/_users -d '{"_id": "org.couchdb.user:admin", "name": "admin", "password":"pass", "type":"user", "roles":[]}' -H "Content-Type: application/json"
```

### Kanso

[Kanso](http://kan.so) is required to build and deploy.

```
npm install kanso -g
```

### Grunt

[Grunt](http://gruntjs.com) is required to build.

```
npm install grunt-cli -g
```

### Configure Lucene

Add the following to CouchDB config `httpd_global_handlers`:

```
_fti = {couch_httpd_proxy, handle_proxy_req, <<"http://127.0.0.1:5985">>}
```

Update `$lucene_home/conf/couchdb-lucene.ini` so the URL has credentials, eg:

```
url=http://admin:pass@localhost:5984/
```

Start lucene: `$lucene_home/bin/run`

You should now see the same welcome message at:

```
curl http://localhost:5985
{"couchdb-lucene":"Welcome","version":"1.0.2"}
curl http://localhost:5984/_fti
{"couchdb-lucene":"Welcome","version":"1.0.2"}
```

## Develop

### Build

```
git clone --recursive https://github.com/medic/medic-webapp
cd medic-webapp
npm install
```

Create a `.kansorc` file in the app directory  with your credentials, eg:

```
exports.env = {
  default: {
    db: "http://admin:pass@localhost:5984/medic",
    overrides: {loglevel:"debug"}
  }
};
```


### Push the couchapp

```
grunt dev
```

Or you can watch and automatically update the app on changes

```
grunt watch
```

### Start medic-sentinel

```
cd sentinel
npm install
export COUCH_URL=http://admin:pass@localhost:5984/medic
node ./server.js
```
See [Medic Sentinel](https://github.com/medic/medic-sentinel) for more information.

### Start medic-api

```
cd api
npm install
export COUCH_URL=http://admin:pass@localhost:5984/medic
node ./server.js
```

See [Medic API](https://github.com/medic/medic-api) for more information.

### Push the dashboard

Dashboard is required to load Medic Mobile. To install Dashboard:

First change the couch db configuration `secure_rewrites` to false.

```
git clone https://github.com/garden20/dashboard
cd dashboard
kanso install
kanso push http://admin:pass@localhost:5984/dashboard
```


### Try it out

Navigate your browser to:

```
http://localhost:5988/medic/_design/medic/_rewrite/
```


## Tests

To run the basic linting and unit tests, run:

```
grunt precommit
```

Some tests are run in browser, you can run them manually if you browse to `/test`
after a push.  To run them from commandline you will need to install
[phantomjs](http://phantomjs.org/).

```
npm install phantomjs -g
grunt test
```


## Loading Data

Loading your form definitions in the settings interface is supported but you can
also do that from command line.

```
node scripts/load_forms.js
```

To bulk load messages from a CSV file run:

```
node scripts/load_messages.js
```

Use curl to submit a single message:

```
curl -i -u gateway:123qwe \
    --data-urlencode 'message=Test One two' \
    --data-urlencode 'from=+13125551212' \
    --data-urlencode 'sent_timestamp=1403965605868' \
    -X POST \
    http://medic.local/medic/_design/medic/_rewrite/add
```


## Deploy to Market

When deploying to market include the sentinel package in the couchapp so
[gardener](https://github.com/garden20/gardener) can manage the process. This
is already automated in the CI scripts and runs on Travis CI but here is the
manual process.

First clone the repo recursively so you get both submodules `api` and
`sentinel`, then change directories:

```
git clone --recursive https://github.com/medic/medic-webapp
cd medic-webapp
```

Then edit `kanso.json` and add `"kanso-gardener":null` to the end of the list
of dependencies.  You can use your editor but
[jsontool](https://github.com/trentm/json) has an edit mode that works to:

```
cat kanso.json |json \
  -e 'this.dependencies["kanso-gardener"] = null; this.dependencies_included = true;' \
  > new.json && \
mv new.json kanso.json
```

Finally push to the [Medic Alpha
Market](https://staging.dev.medicmobile.org/markets-alpha/) run:

```
kanso push https://staging.dev.medicmobile.org/markets-alpha/upload
```


## Help

Join our [Google Group](https://groups.google.com/forum/#!forum/medic-developers) or file an issue on Github.

## Build Status

Builds brought to you courtesy of [Travis CI](https://travis-ci.org/medic/medic-webapp).

Develop      | Testing       | Master
------------ | ------------- | ------------
[![Build Status](https://travis-ci.org/medic/medic-webapp.png?branch=develop)](https://travis-ci.org/medic/medic-webapp/branches) | [![Build Status](https://travis-ci.org/medic/medic-webapp.png?branch=testing)](https://travis-ci.org/medic/medic-webapp/branches) | [![Build Status](https://travis-ci.org/medic/medic-webapp.png?branch=master)](https://travis-ci.org/medic/medic-webapp/branches)


## License & Copyright

Copyright 2013 Medic Mobile, 501(c)(3)  <hello@medicmobile.org>

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
