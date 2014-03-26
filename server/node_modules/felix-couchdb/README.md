# Now maintained and active!!! 

# I'd like to thank Felix for creating this and hope you find it useful when working with node and couchDB.


# Node.js CouchDB module

A thin node.js idiom based module for [CouchDB's REST API](http://wiki.apache.org/couchdb/HTTP_REST_API) that tries to stay close to the metal.

## Tutorial

Installation is simple from [NPM](http://npmjs.org/):

    $ npm install felix-couchdb

To use the library, create a new file called `my-couch-adventure.js`:

    var
      util = require('util'),
      couchdb = require('felix-couchdb'),
      client = couchdb.createClient(5984, 'localhost'),
      db = client.db('my-db');

    db
      .create(function(er){
        if (er) throw new Error(JSON.stringify(er));
        util.puts('Created new db.');
      });

    db
      .saveDoc('my-doc', {awesome: 'couch fun'}, function(er, ok) {
        if (er) throw new Error(JSON.stringify(er));
        util.puts('Saved my first doc to the couch!');
      });

    db
      .getDoc('my-doc', function(er, doc) {
        if (er) throw new Error(JSON.stringify(er));
        util.puts('Fetched my new doc from couch:');
        util.p(doc);
      });

If you are wondering if there is a race-condition in the above example, the answer is no. Each `couchdb.Client` uses an internal queue for its requests, just like `http.Client`. This guarantees ordering. If you want to perform multiple requests at once, use multiple `couchdb.Client` instances.

## API Documentation

### Callbacks

All asynchronous functions are performed with callbacks.  Callback functions are always the last argument, and always receive one or two arguments.  The first argument is an error object or `null` if no error occurs.  The second is the data returned by the function in question, if appropriate.

The callback argument is optional.  If not supplied, then errors and return values will be silently ignored.

For example:

    client.request('/_uuids', {count: 2}, function (er, data) {
      if (er) {
        // an error occurred.  Attempt to handle it or rethrow, or whatever.
      } else {
        // data is the result of the request.
      }
    })

### couchdb.toJSON(data)

Identical to `JSON.stringify()`, except that function values will be converted to strings like this:

    couchdb.toJSON({
      foo: 'bar',
      fn: function(a, b) {
        p(a, b);
      }
    })
    // => {"foo":"bar","fn":"function (a, b) {\n    p(a, b);\n  }"}

node-couchdb uses this function everywhere for JSON serialization, this makes it convenient to embed functions.

### couchdb.toQuery(query)

Identical to `querystring.stringify()`, except that boolean values will be converted to `"true"` / `"false"` strings like this:

    couchdb.toQuery({
      include_docs: true
    })
    // => include_docs=true

node-couchdb uses this function everywhere for query serialization, this helps since couchdb expects boolean values in this format.

### couchdb.toAttachment(file, cb)

Takes the path of a `file` and callback receives a JS object suitable for inline document attachment:

    couchdb
      .toAttachment(__filename, function(er, r) {
        if (er) throw new Error(JSON.stringify(er));
        // r => {"content_type":"text/javascript","data":"dmFyCiAgs...="}
      });

Check `lib/dep/mime.js` for a list of recognized file types.

### couchdb.createClient([port, host, user, pass, maxListeners, secure])

Creates a new `couchdb.Client` for a given `port` (default: `5984`) and `host` (default: `'localhost'`). This client will queue all requests that are send through it, so ordering of requests is always guaranteed. Use multiple clients for parallel operations.

If the optional `user` and `pass` arguments are supplied, all requests will be made with HTTP Basic Authorization

If the optional `maxListeners` is supplied - module uses emitter.setMaxListeners method. It may be usefull if you use many couchdb requests and don't want to see warnings.
Default Node.js value for this == 11 listeners; if `maxListeners` == 0 then warnings are off.

If the optional `secure` is supplied as true, then the https transport is used. Note that https is usually serviced on port 443. This is useful when using cloud-based CouchDB services such as Cloudant where their API is hosted on a https platform e.g.

      client = couchdb.createClient(443, 'username.cloudant.com','username','password',0,true),
      
### client.host

The host this client is connecting to. READ-ONLY property

### client.port

The port this client is connecting to. READ-ONLY property

### client.request(path, [query], cb)

Sends a GET request with a given `path` and `query`. Callback receives a result object. Example:

    client.request('/_uuids', {count: 2})

### client.request(method, [path, query])

Sends a request with a given `method`, `path` and `query`. Callback receives a result object. Example:

    client.request('get', '/_uuids', {count: 2})

### client.request(options, cb)

Sends a request using the given `options` and callback receives a result object. Available options are:

* `method`: The HTTP method (default: `'GET'`)
* `path`: The request path (default: `'/'`)
* `headers`: Additional http headers to send (default: `{}`)
* `data`: A JS object or string to send as the request body (default: `''`)
* `query`: The query options to use (default: {}).
* `requestEncoding`: The encoding to use for sending the request (default: `'utf8'`)
* `responseEncoding`: The encoding to use for sending the request. If set to `'binary'`, the response is emitted as a string instead of an object and the `full` option is ignored. (default: `'utf8'`)
* `full`: By default the callback receives the parsed JSON as a JS object. If `full` is set to true, a `{headers: ..., json: ...}` object is yielded instead. (default: `false`)

Example:

    client.request({
      path: '/_uuids',
      query: {count: 5},
      full: true
    }, callback);

### client.allDbs()

Wrapper for [GET /\_all\_dbs](http://wiki.apache.org/couchdb/HTTP_database_API#List_Databases).

### client.config()

Wrapper for [GET /\_config](http://wiki.apache.org/couchdb/API_Cheatsheet).

### client.uuids([count])

Wrapper for [GET /\_uuids](http://wiki.apache.org/couchdb/API_Cheatsheet). `count` is the number of uuid's you would like CouchDB to generate for you.

### client.replicate(source, target, [options])

Wrapper for [POST /\_replicate](http://wiki.apache.org/couchdb/Replication). `source` and `target` are references to the databases you want to synchronize, `options` can include additional keys such as `{create_target:true}`.

### client.stats([group, key])

Wrapper for [GET /\_stats](http://wiki.apache.org/couchdb/Runtime_Statistics). `group` and `key` can be used to limit the stats to fetch.

### client.activeTasks()

Wrapper for [GET /\_active\_tasks](http://wiki.apache.org/couchdb/API_Cheatsheet).

### client.db(name)

Creates a new `couchdb.Db` instance for a database with the given `name`.

### db.name

The name of the db this instance is tied to. READ-ONLY property

### db.client

A reference to the `couchdb.Client` this instance is tied to. READ-ONLY property

### db.request(options)

Same as `client.request`, but the `path` option gets automatically prefixed by `'/db-name'`.

### db.exists(cb)

Callback called with a boolean indicating whether this db exists or not.

### db.info(cb)

Wrapper for [GET /db-name](http://wiki.apache.org/couchdb/HTTP_database_API#Database_Information).

### db.create(cb)

Wrapper for [PUT /db-name](http://wiki.apache.org/couchdb/HTTP_database_API#PUT_.28Create_New_Database.29).

### db.remove()

Wrapper for [DELETE /db-name](http://wiki.apache.org/couchdb/HTTP_database_API#DELETE).

### db.getDoc(id, [rev], [attachments])

Wrapper for [GET /db-name/doc-id\[?rev=\]\[&attachments=\]](http://wiki.apache.org/couchdb/HTTP_Document_API#GET). Fetches a document with a given `id` and optional `rev` and/or `attachments` from the database.

### db.saveDoc(id, doc)

Wrapper for [PUT /db-name/doc-id](http://wiki.apache.org/couchdb/HTTP_Document_API#PUT). Saves a json `doc` with a given `id`.

### db.saveDoc(doc)

Same as the above, but the `id` can either a property of `doc`, or omitted to let CouchDB generate a uuid for this new document.

### db.removeDoc(id, rev)

Deletes document `id` with `rev` from the db.

### db.copyDoc(srcId, destId, [destRev])

Copies document `srcId` to `destId`. If `destId` already exists, you need to supply `destRev` to overwrite it.

### db.bulkDocs(data)

Wrapper for [POST /db-name/\_bulk_docs](http://wiki.apache.org/couchdb/HTTP_Bulk_Document_API#Modify_Multiple_Documents_With_a_Single_Request).

### db.saveDesign(design, doc)

A convenience wrapper for `saveDoc()` that prefixes the document id with `'_design/'+design`. Useful for storing views like this:

    db
      .saveDesign('my-design', {
        views: {
          "my-view": {
            map: function() {
              emit(null, null)
            }
          }
        }
      })

### db.saveAttachment(file, docId, options)

Attaches a `file` to a given `docId`. Available `options`:

* `name`: The name of the attachment. (default: `path.basename(file)`)
* `contentType`: The content type to associate with this attachment (default: see `lib/dep/mime.js`)
* `rev`: If the `docId` already exists, you have to supply its current revision.

### db.removeAttachment(docId, attachmentId, docRev)

Delete attachment `attachmentId` from doc `docId` with `docRev`.

### db.getAttachment(docId, attachmentId, cb)

Loads the attachment `attachmentId` from `docId`. The callback receivesthe binary content of the attachment. There is no streaming, don't use this with large files.

### db.allDocs(query)

Wrapper for [GET /db-name/\_all\_docs](http://wiki.apache.org/couchdb/HTTP_Document_API#All_Documents). `query` allows to specify options for this view.

### db.allDocsBySeq(query)

Wrapper for [GET /db-name/\_all\_docs\_by\_seq](http://wiki.apache.org/couchdb/HTTP_Document_API#all_docs_by_seq).

Replaced by [GET /db-name/\_changes](http://wiki.apache.org/couchdb/HTTP_database_API#Changes) as of CouchDB 0.11.
Consider using `db.changes` or `db.changesStream`.

### db.compact([design])

Wrapper for [POST /db-name/\_compact/design-name](http://wiki.apache.org/couchdb/HTTP_view_API#View_Compaction). `design` provides the name of the design to invoke compact for, otherwise the whole db is used.

### db.tempView(data, query)

Wrapper for [POST /db-name/\_temp\_view](http://wiki.apache.org/couchdb/HTTP_view_API#Temporary_Views).

### db.viewCleanup(data, query)

Wrapper for [POST /db-name/\_view\_cleanup](http://wiki.apache.org/couchdb/HTTP_view_API#View_Cleanup).

### db.view(design, view, [query], [cb])

Wrapper for [GET /db-name/\_design/design-name/\_view/view-name](http://wiki.apache.org/couchdb/HTTP_view_API#Access.2BAC8-Query). Fetches all documents for the given `design` and `view` with the specified `query` options.

### db.list(design, list, view, [query], [cb])

Wrapper for [GET /db-name/\_design/design-name/\_list/list-name/view-name](http://wiki.apache.org/couchdb/Formatting_with_Show_and_List#Listing_Views_with_CouchDB_0.10_and_later). Fetches all documents for the given `design` and `view` with the specified `query` options.

### db.changes([query])

Wrapper for [GET /db-name/\_changes](http://wiki.apache.org/couchdb/HTTP_database_API#Changes). This can be used for long-polling or one-time retrieval from the changes feed. If you want to get a continuous stream of changes, use the `db.changesStream()` function instead.

### db.changesStream([query])

Returns an `events.EventEmitter` stream that emits the following events:

* `data(change)`: Emitted for each change line in the stream. The `change` parameter holds the change object.
* `heartbeat`: Emitted for each heartbeat send by CouchDB, no need to check this for most stuff.
* `end(hadError)`: Emitted if the stream ends. This should not happen unless you manually invoke `stream.close()`.

See the [CouchDB docs](http://wiki.apache.org/couchdb/HTTP_database_API#Changes) for available `query` parameters.

*Important:* This function uses its own http client for making requests, so unlike all other functions it does not go through the internal request queue.

## Todo

* http status, message and parsed body for errors
* db.saveAttachment(file, docId, options) take file descriptor
* Implement Authentication

## Limitations

* Streaming attachments is not supported at this point (patches welcome)
* Etags are only available via client.request({full: true})

