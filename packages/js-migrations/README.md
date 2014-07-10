JavaScript Migrations
=====================

Installation
-------------------

`npm install js-migrations` or [kanso](http://kan.so/packages/details/js-migrations)

Defining Migrations
-------------------

A migration is an object with a `version` and one or both of `up` and `down` functions, which migrate up to, or down from this version respectively. For example:

```
var myMigration = {
  version: '1.2.5',
  up: function(obj, callback) {
    var num = parseInt(obj.a);
    if (isNaN(num)) {
      return { error: 'a is not a number' };
    } else {
      obj.a = num
      return { error: false, result: obj };
    }
  },
  down: function(obj, callback) {
    obj.a = obj.a + '';
    return { error: false, result: obj };
  }
};
```

Version should be unique between migrations or there will be no way to tell which set of migrations have been run.

Running Migrations
------------------

```
var migration = require('js-migrations');
var migrated = migration.migrate(
  { a: '42' },
  [ myMigration ],
  { from: '1.1.5', to: '2.1.3' }
);
if (migrated.err) throw migrated.err;
var obj = migrated.result;
```

If `from` or `to` is omitted above there will be no lower or upper limit respectively. If both are omitted all migrations will be run. If `from` is greater than `to` then the down migrations are run.

All versions must follow the [semver](http://semver.org/) format.

Build Status
------------

[![Build Status](https://travis-ci.org/medic/js-migrations.png?branch=master)](https://travis-ci.org/medic/js-migrations)