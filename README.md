
## Install

1. Clone the repo as usual then do `git submodule init && git submodule update` to
get a copy of `json-forms`.  

2. Run `kanso push` to build/install the couchapp.

## Configure

Optionally configure your app with:

```
curl -X POST http://localhost:5984/yourdb -d @config.js -H "Content-Type: application/json"
```

See `config-example.js` for an example.

## Kujua Reporting

To enable the kujua reporting (analytics) module, see `packages/kujua-reporting/README.md`.

## Sentinel

Sentinel is a optional node process that updates records, schedules reminders and does
other stuff that just a browser and Couch cannot. See `sentinel/README.md` for
more information.

