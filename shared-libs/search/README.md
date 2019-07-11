# Search

A shared library that uses CouchDB views to generate search results.

## v1 API

You must initialise the library with a Promise library and a PouchDB DB:

```js
const Search = require('search')(Promise, new PouchDB('foo'));
```

PouchDB needs access to at least map reduce and some kind of back-end (here HTTP):

```js
const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));
```

You can then request search results for Reports and contacts:

```js
Search('reports', {}, {limit: 50, skip: 0})
    .then(ids => {
        ...
    })
```

The first parameter is the type, the second parameter is the query params described in the sections below, and the third are options related to pagination.

### Contacts

There is only one query option in contacts: `search`:

```js
Search('contacts', {search: "your search terms"})
    .then(ids => { ... })
```

These search terms are broken up and used on tokens pulled from contacts. Names, dobs, phone numbers etc.

### Reports

Basic example of all the options:

```json
{
  "forms": {
    "selected": [
      {
        "code": "confirm_death",
      },
      {
        "code": "delivery",
      },
      {
        "code": "immunization_visit",
      }
    ],
  },
  "facilities": {
    "selected": [
      "665e98ef-8fdf-43ba-90aa-1fd422daaa5b",
      "bf99cec0-a0eb-4f77-a557-d2fe2c694b94"
    ],
  },
  "date": {
    "from": 1517443200000,
    "to": 1518825599999
  },
  "valid": true,
  "verified": true,
  "search": "your search terms"
}
```

`forms.selected` is an array of `{code: "foo"}` objects where `foo` is the form code.

`facilities.selected` is an array of `_id` values for those facilities.

`date.from` and `date.to` are outputs from `Date.getTime()`: the number of milliseconds since Jan 1st 1970 UTC.

`valid` is whether or not the forms returned are forms without errors (undefined means either).

`verified` is whether or not the forms returns have been validated (undefined means either).

`search` follows the same logic as for contacts, but for data in reports.
