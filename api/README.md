# medic-api

Node server to support CHT applications.

Details about the API endpoints are available on the [documentation site](https://docs.communityhealthtoolkit.org/apps/reference/api/).

# Development

## Install

Get node deps with `npm ci`.

## Settings

Export a `COUCH_URL` env variable so sentinel knows what database to use. e.g.

```
export COUCH_URL='http://myadminuser:myadminpass@localhost:5984/medic'
```

If you want to allow cross-origin requests, add the flag `--allow-cors` when starting api. E.g.

    node server.js --allow-cors

## Run

`grunt deploy`

or

    node server.js

# Migrations

Migrations are scripts located in the `/migrations` directory, and are automatically by medic-api run before the webserver starts up.

Typically, migrations are used to run a specific edit on all docs in the database (e.g. add a field to all docs of type X), but you can do whatever you like in a migration.

Migrations are only run once, and are run in the order they were created, based on their `created` date. Only one migration is run at a time.

Migrations that error will cause medic-api to stop on an error, and will be attempted again the next time you start medic-api.

## Migration script api

Your migration script should have an export that looks like this:

```js
module.exports = {
  name: 'your-unique-migration-name',
  created: new Date(2016, 10, 20),
  run: function(callback) {
    // If your migrations errors
    return callback(err);
    // Or upon success
    return callback();
  },
};
```

Place your script in the `/migrations` folder and it will get picked up by medic-api at the next restart.

## Implementation, re-running migrations by hand

See [`migrations.js`](https://github.com/medic/cht-core/tree/master/api/src/migrations).

Importantly, the record of which migrations have been run is stored in the `migrations` array of an arbitrarily named document in CouchDB with the `.type` of `meta`. Because of this it can be a hard document to find, but you can get it using `curl`, and pretty print it with `jq`:

```
curl 'http://myadminuser:myadminpass@localhost:5984/medic/_design/medic-client/_view/doc_by_type?key=\["meta"\]&include_docs=true' | jq .rows[].doc
```

So, if you want to re-run a migration, delete its entry in the `migrations` list and re-run api.


