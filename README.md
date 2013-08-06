# Kujua Lite

These instructions should help you get setup to run or develop on Kujua Lite.

## Dependencies

You will need to intall the following...

### Node and CouchDB

Assuming you have [Nodejs](http://nodejs.org) and [CouchDB](http://couchdb.apache.org) installed.

### Kanso

[Kanso](http://kan.so) is required to build and deploy Kujua Lite.

```
npm install kanso -g
```

### Kujua Sentinel

Kujua Lite is bundled with a node application, called Sentinel, they work together.
Sentinel listens to the changes feed and does various things, like schedule
management.  

Clone Kujua Sentinel:

```
git clone https://github.com/medic/kujua-sentinel
```

See [Kujua Sentinel](https://github.com/medic/kujua-sentinel) for more information.

## Deploy the app

Push the couchapp:

```
git clone --recursive https://github.com/medic/kujua-lite
cd kujua-lite
kanso push http://admin:pass@localhost:5984/kujua-lite
```

Start kujua-sentinel:

```
cd kujua-sentinel
export COUCH_URL=http://admin:pass@localhost:5984/kujua-lite
node ./server.js
```

Navigate your browser to:

```
http://localhost:5984/
```

## Configure

TODO

Since dashboard is required to configure Kujua Lite, we might need to change
the dev docs to install Kujua Lite from the market and then overwrite with a
kanso push.  Best option I can come up with at the moment.

## Tests

Tests are run in browser, you can run them manually if you browse to `/test`
after a push.  To run them from commandline you will need to install
[phantomjs](http://phantomjs.org/).

```
npm install phantomjs -g
./tests/phantom_test.sh http://localhost:5984/kujua-lite
```

## Build Status

Builds brought to you courtesy of [Travis CI](https://travis-ci.org/medic/kujua-lite).

Develop      | Master 
------------ | -------------
[![Build Status](https://travis-ci.org/medic/kujua-lite.png?branch=develop)](https://travis-ci.org/medic/kujua-lite/branches) | [![Build Status](https://travis-ci.org/medic/kujua-lite.png?branch=master)](https://travis-ci.org/medic/kujua-lite/branches)



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
