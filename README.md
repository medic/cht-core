## Dependencies

### Node and CouchDB

Assuming you have [Nodejs](http://nodejs.org) and [CouchDB](http://couchdb.apache.org) installed.

### Kanso

[Kanso](http://kan.so) is required to build and deploy Kujua.

```
npm install kanso -g
```

### Gardener

Kujua is bundled with a node application, called Sentinel, they work together.
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
git clone --recursive https://github.com/medic/kujua
cd kujua
kanso push http://admin:pass@localhost:5984
```

Start gardener:

```
gardener http://admin:pass@localhost:5984/kujua-base
```

## Configure

Optionally customize your app:

```
cp config-example.js config.js
vi config.js 
```

Install your config:

```
curl -X POST http://admin:pass@localhost:5984/kujua-base -d @config.js \
     -H "Content-Type: application/json"
```


### Reporting Rates

To enable the reporting rates module, see 
[packages/kujua-reporting/README.md](packages/kujua-reporting/README.md).

### Sentinel

See [sentinel/README.md](sentinel/README.md) for more information about
configuring Sentinel.

