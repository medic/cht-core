# couchr

Simple request library for CouchDB. Provides both a Node.js module and a
browser module (based on jQuery.ajax), with better CouchDB error reporting
and a simpler API than making XHR requests directly in the browser.


### Examples

```javascript
// browser
require(['couchr'], function (couchr) {
    couchr.get('/dbname/docid', function (err, doc) {
        ...
    });
});

// Node
var couchr = require('couchr');
couchr.get('http://hostname:port/dbname/docid', function (err, doc) {
    ...
});
```

### Methods

```javascript
couchr.get (url, /*optional*/params, function (err, res, req) { ... })
couchr.post(url, /*optional*/data,   function (err, res, req) { ... })
couchr.put (url, /*optional*/data,   function (err, res, req) { ... })
couchr.del (url, /*optional*/data,   function (err, res, req) { ... })
couchr.head(url, function (err, res, req) { ... })

couchr.copy(from, to, function (err, res, req) { ... }) 

var feed = couchr.changes(db_url);
feed.on('change', function (change_object) { ...  });
feed.on('error', function (err) { ...  });
feed.pause();
feed.resume();
```

### Installation

Browser (using [jam](http://jamjs.org)):

    jam install couchr

Node (using [npm](http://npmjs.org)):

    npm install couchr
