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
    GET /kujua-lite/_design/kujua-lite/_rewrite/app_settings/kujua-lite HTTP/1.1
    Host: localhost
```

Do not to pass the ID of the design doc (eg: '_design/kujua-lite'), instead
pass the name (eg: 'kujua-lite'). This avoids having to escape the parameters.

Optionally you can also pass in a path to a specific property using an object
path dot notation, like:

```
    GET /kujua-lite/_design/kujua-lite/_rewrite/app_settings/kujua-lite/foo.bar.baz HTTP/1.1
    Host: localhost
```

This would return the `baz` object located at `{foo: {bar: {baz: {}}}}`.

Update Settings
-----------------

To update the settings, PUT the new settings to the document update function passing the name of the design doc, eg:

```
    PUT /kujua-lite/_design/kujua-lite/_rewrite/update_settings/kujua-lite HTTP/1.1
    Host: localhost
    Content-Type: application/json; charset=utf-8

    { "forms": { "R": { "name": "foo", "desc": "bar" }}} 
```

As with retrieving settings, use the name of the design document, not the ID.

The body must be a valid JSON object and will be merged with the current
app_settings, so you should submit a partial object rather than the entire
app_settings.  **Note** that app_settings arrays are replaced not merged.

To replace an object completely use the `?replace=1` query parameter. For
example:

```
    PUT /kujua-lite/_design/kujua-lite/_rewrite/update_settings/kujua-lite?replace=1 HTTP/1.1
    Host: localhost
    Content-Type: application/json; charset=utf-8

    { "forms": { "R": { "name": "foo", "desc": "bar" }}} 
```

Then the forms object would be completely replaced instead of extended/merged.

Command line
============

    npm install app_settings -g

Restore
-------

    app_settings restore http://admin:admin@localhost:5984/kujua/_design/kujua-lite

Restore app_settings from the last revision of the doc that had app_settings. Useful when a couchapp has been pushed in development mode, and the app_settings have not been preserved.


Clear
-----

    app_settings clear http://admin:admin@localhost:5984/kujua/_design/kujua-lite

Removes the app_settings from the design doc. They can be restored with the restore command above.


Copy
----

    app_settings copy http://admin:admin@localhost:5984/kujua/_design/kujua-lite http://admin:admin@remote:5984/kujua/_design/kujua-lite


Copy app_settings from one app to another. The second url is the the target design doc to copy to.

