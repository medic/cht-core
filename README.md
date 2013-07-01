## Dependencies

### Node and CouchDB

Assuming you have [Nodejs](http://nodejs.org) and [CouchDB](http://couchdb.apache.org) installed.

### Kanso

[Kanso](http://kan.so) is required to build and deploy Kujua Lite.

```
npm install kanso -g
```

### Gardener

Kujua Lite is bundled with a node application, called Sentinel, they work together.
Sentinel listens to the changes feed and does various things, like schedule
management.  Sentinel is built using
[kanso-gardener](https://github.com/kanso/kanso-gardener) and attached to the
design doc then unpacked and monitored by
[gardener](https://github.com/garden20/gardener).

You will also need gardener:

```
npm install gardener -g
```

## Deploy

Deploy the couchapp:

```
git clone --recursive https://github.com/medic/kujua-lite
cd kujua-lite
kanso push http://admin:pass@localhost:5984/kujua-lite
```

Start gardener:

```
gardener http://admin:pass@localhost:5984/
```

## Configure

Optionally customize your app:

```
cp config-example.js config.js
vi config.js
```

Install your config:

```
curl -X POST http://admin:pass@localhost:5984/kujua-lite -d @config.js \
     -H "Content-Type: application/json"
```


### Reporting Rates

To enable the reporting rates module, see
[packages/kujua-reporting/README.md](packages/kujua-reporting/README.md).

### Sentinel

See [sentinel/README.md](sentinel/README.md) for more information about
configuring Sentinel.

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
