Clone the repo as usual then do `git submodule init && git submodule update` to
get a copy of `json-forms`.

## Configure

Optionally configure your app with:

```
curl -X POST http://localhost:5984/yourdb -d @config.js -H "Content-Type: application/json"
```

## Kujua Reporting

To enable the kujua reporting (analytics) module, see `packages/kujua-reporting/README.md`.
