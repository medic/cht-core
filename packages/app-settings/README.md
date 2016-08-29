Manage an app_settings property on a couchdb document. Mainly used to store app settings on a design_doc. See also:

https://github.com/garden20/couchapp-settings for a ui.


API
===

To access or update app_settings in a couchapp, add a dependency to this package, then include the following in your rewrites.js

    rewrites.concat(require('app-settings/rewrites'));

Retrieve Settings
-----------------

To access the settings, request the app_settings show passing the name of the design doc, eg:

```
    GET /medic/_design/medic/_rewrite/app_settings/medic HTTP/1.1
    Host: localhost
```

Do not to pass the ID of the design doc (eg: '_design/medic'), instead
pass the name (eg: 'medic'). This avoids having to escape the parameters.

This will return an object with two main properties, `settings` and `schema`.
The schema is what is used to validate the settings.  If you just need the
settings values then use the `settings` property.

Optionally you can also pass in a path to a specific property using an object
path dot notation, like:

```
    GET /medic/_design/medic/_rewrite/app_settings/medic/foo.bar.baz HTTP/1.1
    Host: localhost
```

This would return the `baz` object located at `{foo: {bar: {baz: {}}}}`.

Update Settings
-----------------

NB: this will not replace the whole settings with the object you are PUTing. Currently there is no endpoint to do that. Read this section carefully! [See the tests for examples of behavior](https://github.com/garden20/app_settings/blob/master/tests/app-settings/update.js).

This endpoint will merge or replace a part of the app_settings with the changes object (partial app_settings, containing only the fields you want to change) that you pass in the PUT. The changes object should be valid JSON.

There are two modes : merging (default) and replacing.


#### Merging
PUT a partial app_settings object, which contains the part you want to update. It's not necessary to pass the parts that stay the same. The app_settings will be merged with your update object.

Initial settings :
`{ parent: { one: "a", two: "b" }, other: {stuff: "blah" } }`

Request :
```
    PUT /< dbname >/_design/< ddoc name >/_rewrite/update_settings/< ddoc name > HTTP/1.1
    Host: localhost
    Content-Type: application/json; charset=utf-8

    { "parent": { "one": "d", "three": "c" } }
```

Resulting settings :
`{ parent: { one: "d", two: "b", three: "c" }, other: {stuff: "blah" } }`

`parent.three` has been added because it wasn't present at all originally.
`parent.one` has been replaced because it was already present.
`other` is unchanged. (Note : `other` is not removed! The object passed in the request is a changes object, it's not meant to fully replace the existing one.)


#### Replacing
You cannot replace the whole app_settings object, but you can replace a top-level property of the app_settings object.

Initial settings :
`{ parent: { one: "a", two: "b" }, other: {stuff: "blah" } }`

```
    PUT /< dbname >/_design/< ddoc name >/_rewrite/update_settings/< ddoc name >?replace=1 HTTP/1.1
    Host: localhost
    Content-Type: application/json; charset=utf-8

    { "parent": { "three": "c" } }
```

Resulting settings :
`{ parent: { three: "c" }, other: {stuff: "blah" } }`

The `parent` top-level property has been replaced by the one passed in the request.
The `other` field is left unchanged, since the object passed in the request didn't contain an `other` top-level field.


Command line
============

    npm install app_settings -g

Restore
-------

    app_settings restore http://admin:admin@localhost:5984/kujua/_design/medic

Restore app_settings from the last revision of the doc that had app_settings. Useful when a couchapp has been pushed in development mode, and the app_settings have not been preserved.


Clear
-----

    app_settings clear http://admin:admin@localhost:5984/kujua/_design/medic

Removes the app_settings from the design doc. They can be restored with the restore command above.


Copy
----

    app_settings copy http://admin:admin@localhost:5984/kujua/_design/medic http://admin:admin@remote:5984/kujua/_design/medic


Copy app_settings from one app to another. The second url is the the target design doc to copy to.

