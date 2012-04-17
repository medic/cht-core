/*global $: false */

/**
 * ## DB Module
 *
 * This contains the core functions for dealing with CouchDB. That includes
 * document CRUD operations, querying views and creating/deleting databases.
 *
 *
 * ### Events
 *
 * The db module is an EventEmitter. See the
 * [events package](http://kan.so/packages/details/events) for more information.
 *
 * #### unauthorized
 *
 * Emitted by the db module when a request results in a 401 Unauthorized
 * response. This is listened to used by the session module to help detect
 * session timeouts etc.
 *
 * ```javascript
 * var db = require("db");
 *
 * db.on('unauthorized', function (req) {
 *     // req is the ajax request object which returned 401
 * });
 * ```
 *
 * @module
 */


var events = require('events'),
    _ = require('underscore')._;


/**
 * Tests if running in the browser
 *
 * @returns {Boolean}
 */

function isBrowser() {
    return (typeof(window) !== 'undefined');
}


/**
 * This module is an EventEmitter, used for emitting 'unauthorized' events
 */

var exports = module.exports = new events.EventEmitter();


/**
 * Taken from jQuery 1.4.4 so we can support more recent versions of jQuery.
 */

var httpData = function (xhr, type, s) {
    var ct = xhr.getResponseHeader("content-type") || "",
        xml = type === "xml" || !type && ct.indexOf("xml") >= 0,
        data = xml ? xhr.responseXML : xhr.responseText;

    if (xml && data.documentElement.nodeName === "parsererror") {
        $.error("parsererror");
    }
    if (s && s.dataFilter) {
        data = s.dataFilter(data, type);
    }
    if (typeof data === "string") {
        if (type === "json" || !type && ct.indexOf("json") >= 0) {
            data = $.parseJSON(data);
        }
        else if (type === "script" || !type && ct.indexOf("javascript") >= 0) {
            $.globalEval(data);
        }
    }
    return data;
};


/**
 * Returns a function for handling ajax responses from jquery and calls
 * the callback with the data or appropriate error.
 *
 * @param {Function} callback(err,response)
 * @api private
 */

function onComplete(options, callback) {
    return function (req) {
        var resp;
        var ctype = req.getResponseHeader('Content-Type');
        if (ctype === 'application/json' || ctype === 'text/json') {
            try {
                resp = httpData(req, "json");
            }
            catch (e) {
                return callback(e);
            }
        }
        else {
            if (options.expect_json) {
                try {
                    resp = httpData(req, "json");
                }
                catch (ex) {
                    return callback(
                        new Error('Expected JSON response, got ' + ctype)
                    );
                }
            }
            else {
                resp = req.responseText;
            }
        }
        if (req.status === 401) {
            exports.emit('unauthorized', req);
        }
        if (req.status === 200 || req.status === 201 || req.status === 202) {
            callback(null, resp);
        }
        else if (resp.error || resp.reason) {
            var err = new Error(resp.reason || resp.error);
            err.error = resp.error;
            err.reason = resp.reason;
            err.code = resp.code;
            err.status = req.status;
            callback(err);
        }
        else {
            // TODO: map status code to meaningful error message
            var err2 = new Error('Returned status code: ' + req.status);
            err2.status = req.status;
            callback(err2);
        }
    };
}


/**
 * Attempts to guess the database name and design doc id from the current URL,
 * or the loc paramter. Returns an object with 'db', 'design_doc' and 'root'
 * properties, or null for a URL not matching the expected format (perhaps
 * behing a vhost).
 *
 * You wouldn't normally use this function directly, but use `db.current()` to
 * return a DB object bound to the current database instead.
 *
 * @name guessCurrent([loc])
 * @param {String} loc - An alternative URL to use instead of window.location
 *     (optional)
 * @returns {Object|null} - An object with 'db', 'design_doc' and 'root'
 *     properties, or null for a URL not matching the
 *     expected format (perhaps behing a vhost)
 * @api public
 */

exports.guessCurrent = function (loc) {
    var loc = loc || window.location;

    /**
     * A database must be named with all lowercase letters (a-z), digits (0-9),
     * or any of the _$()+-/ characters and must end with a slash in the URL.
     * The name has to start with a lowercase letter (a-z).
     *
     * http://wiki.apache.org/couchdb/HTTP_database_API
     */

    var re = /\/([a-z][a-z0-9_\$\(\)\+-\/]*)\/_design\/([^\/]+)\//;
    var match = re.exec(loc.pathname);

    if (match) {
        return {
            db: match[1],
            design_doc: match[2],
            root: '/'
        }
    }
    return null;
};

/**
 * Converts an object to a string of properly escaped URL parameters.
 *
 * @name escapeUrlParams([obj])
 * @param {Object} obj - An object containing url parameters, with
 *       parameter names stored as property names (or keys).
 * @returns {String}
 * @api public
 */

exports.escapeUrlParams = function (obj) {
    var rv = [ ];
    for (var key in obj) {
        rv.push(
            encodeURIComponent(key) +
                '=' + encodeURIComponent(obj[key])
        );
    }
    return (rv.length > 0 ? ('?' + rv.join('&')) : '');
};

/**
 * Encodes a document id or view, list or show name. This also will make sure
 * the forward-slash is not escaped for documents with id's beginning with
 * "\_design/".
 *
 * @name encode(str)
 * @param {String} str - the name or id to escape
 * @returns {String}
 * @api public
 */

exports.encode = function (str) {
    return encodeURIComponent(str).replace(/^_design%2F/, '_design/');
};


/**
 * Properly encodes query parameters to CouchDB views etc. Handle complex
 * keys and other non-string parameters by passing through JSON.stringify.
 * Returns a shallow-copied clone of the original query after complex values
 * have been stringified.
 *
 * @name stringifyQuery(query)
 * @param {Object} query
 * @returns {Object}
 * @api public
 */

exports.stringifyQuery = function (query) {
    var q = {};
    for (var k in query) {
        if (typeof query[k] !== 'string') {
            q[k] = JSON.stringify(query[k]);
        }
        else {
            q[k] = query[k];
        }
    }
    return q;
};


/**
 * Make a request, with some default settings, proper callback
 * handling, and optional caching. Used behind-the-scenes by
 * most other DB module functions.
 *
 * @name request(options, callback)
 * @param {Object} options
 * @param {Function} callback(err,response)
 * @api public
 */

exports.request = function (options, callback) {
    options.complete = onComplete(options, callback);
    options.dataType = 'json';
    $.ajax(options);
};


/**
 * Creates a CouchDB database.
 *
 * If you're running behind a virtual host you'll need to set up
 * appropriate rewrites for a DELETE request to '/' either turning off safe
 * rewrites or setting up a new vhost entry.
 *
 * @name createDatabase(name, callback)
 * @param {String} name
 * @param {Function} callback(err,response)
 * @api public
 */

exports.createDatabase = function (name, callback) {
    var req = {
        type: 'PUT',
        url: '/' + exports.encode(name.replace(/^\/+/, ''))
    };
    exports.request(req, callback);
};

/**
 * Deletes a CouchDB database.
 *
 * If you're running behind a virtual host you'll need to set up
 * appropriate rewrites for a DELETE request to '/' either turning off safe
 * rewrites or setting up a new vhost entry.
 *
 * @name deleteDatabase(name, callback)
 * @param {String} name
 * @param {Function} callback(err,response)
 * @api public
 */

// TODO: detect when 'name' argument is a url and don't construct a url then
exports.deleteDatabase = function (name, callback) {
    var req = {
        type: 'DELETE',
        url: '/' + exports.encode(name.replace(/^\/+/, ''))
    };
    exports.request(req, callback);
};


/**
 * Lists all databses
 *
 * If you're running behind a virtual host you'll need to set up
 * appropriate rewrites for a DELETE request to '/' either turning off safe
 * rewrites or setting up a new vhost entry.
 *
 * @name allDbs(callback)
 * @param {Function} callback(err,response)
 * @api public
 */

exports.allDbs = function (callback) {
    var req = {
        type: 'GET',
        url: '/_all_dbs'
    };
    exports.request(req, callback);
};


/**
 * Returns a new UUID generated by CouchDB. Its possible to cache
 * multiple UUIDs for later use, to avoid making too many requests.
 *
 * @name newUUID(cacheNum, callback)
 * @param {Number} cacheNum (optional, default: 1)
 * @param {Function} callback(err,response)
 * @api public
 */

var uuidCache = [];

exports.newUUID = function (cacheNum, callback) {
    if (!callback) {
        callback = cacheNum;
        cacheNum = 1;
    }
    if (uuidCache.length) {
        return callback(null, uuidCache.shift());
    }
    var req = {
        url: '/_uuids',
        data: {count: cacheNum},
        expect_json: true
    };
    exports.request(req, function (err, resp) {
        if (err) {
            return callback(err);
        }
        uuidCache = resp.uuids;
        callback(null, uuidCache.shift());
    });
};


/**
 * DB object created by use(dbname) function
 */

function DB(url) {
    this.url = url;
    // add the module functions to the DB object
    for (var k in exports) {
        this[k] = exports[k];
    }
};


/**
 * Creates a new DB object with methods operating on the database at 'url'
 *
 * The DB object also exposes the same module-level methods (eg, createDatabase)
 * so it can be used in-place of the db exports object, for example:
 *
 * ```javascript
 * var db = require('db').use('mydb');
 *
 * db.createDatabase('example', function (err, resp) {
 *     // do something
 * });
 * ```
 *
 * @name use(url)
 * @param {String} url - The url to bind the new DB object to
 * @returns {DB}
 * @api public
 */

// TODO: handle full urls, not just db names
exports.use = function (url) {
    /* Force leading slash; make absolute path */
    return new DB((url.substr(0, 1) !== '/' ? '/' : '') + url);
};

/**
 * Attempts to guess the current DB name and return a DB object using that.
 * Should work reliably unless running behind a virtual host.
 *
 * Throws an error if the current database url cannot be detected.
 *
 * The DB object also exposes the same module-level methods (eg, createDatabase)
 * so it can be used in-place of the db exports object, for example:
 *
 * ```javascript
 * var db = require('db').current();
 *
 * db.createDatabase('example', function (err, resp) {
 *     // do something
 * });
 * ```
 *
 * @name current()
 * @returns {DB}
 * @api public
 */

exports.current = function () {
    // guess current db url etc
    var curr = exports.guessCurrent();
    if (!curr) {
        throw new Error(
            'Cannot guess current database URL, if running behind a virtual ' +
            'host you need to explicitly set the database URL using ' +
            'db.use(database_url) instead of db.current()'
        );
    }
    return exports.use(curr.db);
};


/**
 * Fetches a rewrite from the database the app is running on. Results
 * are passed to the callback, with the first argument of the callback
 * reserved for any exceptions that occurred (node.js style).
 *
 * @name DB.getRewrite(name, path, [q], callback)
 * @param {String} name - the name of the design doc
 * @param {String} path
 * @param {Object} q (optional)
 * @param {Function} callback(err,response)
 * @api public
 */

DB.prototype.getRewrite = function (name, path, /*optional*/q, callback) {
    if (!callback) {
        callback = q;
        q = {};
    }
    // prepend forward-slash if missing
    path = (path[0] === '/') ? path: '/' + path;

    try {
        var data = exports.stringifyQuery(q);
    }
    catch (e) {
        return callback(e);
    }
    var req = {
        url: this.url + '/_design/' + exports.encode(name) + '/_rewrite' + path,
        data: data
    };
    exports.request(req, callback);
};


/**
 * Queries all design documents in the database.
 *
 * @name DB.allDesignDocs([q], callback)
 * @param {Object} q - query parameters to pass to /_all_docs (optional)
 * @param {Function} callback(err,response)
 * @api public
 */

DB.prototype.allDesignDocs = function (/*optional*/q, callback) {
    if (!callback) {
        callback = q;
        q = {};
    }
    q.startkey = '"_design"';
    q.endkey = '"_design0"';
    this.allDocs(q, callback);
};


/**
 * Queries all documents in the database (include design docs).
 *
 * @name DB.allDocs([q], callback)
 * @param {Object} q - query parameters to pass to /_all_docs (optional)
 * @param {Function} callback(err,response)
 * @api public
 */

DB.prototype.allDocs = function (/*optional*/q, callback) {
    if (!callback) {
        callback = q;
        q = {};
    }
    try {
        var data = exports.stringifyQuery(q);
    }
    catch (e) {
        return callback(e);
    }
    var req = {
        url: this.url + '/_all_docs',
        data: data,
        expect_json: true
    };
    exports.request(req, callback);
};


/**
 * Fetches a document from the database the app is running on. Results are
 * passed to the callback, with the first argument of the callback reserved
 * for any exceptions that occurred (node.js style).
 *
 * @name DB.getDoc(id, [q], callback)
 * @param {String} id
 * @param {Object} q (optional)
 * @param {Function} callback(err,response)
 * @api public
 */

DB.prototype.getDoc = function (id, /*optional*/q, callback) {
    if (!id) {
        throw new Error('getDoc requires an id parameter to work properly');
    }
    if (!callback) {
        callback = q;
        q = {};
    }
    try {
        var data = exports.stringifyQuery(q);
    }
    catch (e) {
        return callback(e);
    }
    var req = {
        url: this.url + '/' + exports.encode(id),
        expect_json: true,
        data: data
    };
    exports.request(req, callback);
};


/**
 * Saves a document to the database the app is running on. Results are
 * passed to the callback, with the first argument of the callback reserved
 * for any exceptions that occurred (node.js style).
 *
 * @name DB.saveDoc(doc, callback)
 * @param {Object} doc
 * @param {Function} callback(err,response)
 * @api public
 */

DB.prototype.saveDoc = function (doc, callback) {
    var method, url = this.url;
    if (doc._id === undefined) {
        method = "POST";
    }
    else {
        method = "PUT";
        url += '/' + doc._id;
    }
    try {
        var data = JSON.stringify(doc);
    }
    catch (e) {
        return callback(e);
    }
    var req = {
        type: method,
        url: url,
        data: data,
        processData: false,
        contentType: 'application/json',
        expect_json: true
    };
    exports.request(req, callback);
};

/**
 * Deletes a document from the database the app is running on. Results are
 * passed to the callback, with the first argument of the callback reserved
 * for any exceptions that occurred (node.js style).
 *
 * @name DB.removeDoc(doc, callback)
 * @param {Object} doc
 * @param {Function} callback(err,response)
 * @api public
 */

DB.prototype.removeDoc = function (doc, callback) {
    if (!doc._id) {
        throw new Error('removeDoc requires an _id field in your document');
    }
    if (!doc._rev) {
        throw new Error('removeDoc requires a _rev field in your document');
    }
    var req = {
        type: 'DELETE',
        url: this.url + '/' + exports.encode(doc._id) +
             '?rev=' + exports.encode(doc._rev)
    };
    exports.request(req, callback);
};


/**
 * Fetches a view from the database the app is running on. Results are
 * passed to the callback, with the first argument of the callback reserved
 * for any exceptions that occurred (node.js style).
 *
 * @name DB.getView(name, view, [q], callback)
 * @param {String} name - name of the design doc to use
 * @param {String} view - name of the view
 * @param {Object} q (optional)
 * @param {Function} callback(err,response)
 * @api public
 */

DB.prototype.getView = function (name, view, /*opt*/q, callback) {
    if (!callback) {
        callback = q;
        q = {};
    }
    var viewname = exports.encode(view);
    try {
        var data = exports.stringifyQuery(q);
    }
    catch (e) {
        return callback(e);
    }
    var req = {
        url: (this.url +
            '/_design/' + exports.encode(name) +
            '/_view/' + viewname
        ),
        expect_json: true,
        data: data
    };
    exports.request(req, callback);
};


/**
 * Fetches a spatial view from the database the app is running on. Results are
 * passed to the callback, with the first argument of the callback reserved
 * for any exceptions that occurred (node.js style).
 *
 * __Parameters:__
 * * bbox - the bounding box filter e.g.: bbox: '0,0,180,90'
 * * plane_bounds - e.g.: plane_bounds: '-180,-90,180,90'
 * * stale - stale: 'ok' prevents the spatial index to be rebuilt
 * * count - count: true will only return the number of geometries
 *
 * @name DB.getSpatialView(name, view, q, callback)
 * @param {String} name - name of the design doc to use
 * @param {String} view - name of the view
 * @param {Object} q - query parameters (see options above)
 * @param {Function} callback(err,response)
 * @api public
 */

DB.prototype.getSpatialView = function (name, view, q, callback) {
    if (!callback) {
        callback = q;
        q = {};
    }
    var viewname = exports.encode(view);
    try {
        var data = exports.stringifyQuery(q);
    }
    catch (e) {
        return callback(e);
    }
    var req = {
        url: (this.url +
            '/_design/' + exports.encode(name) +
            '/_spatial/' + viewname
        ),
        expect_json: true,
        data: data
    };
    exports.request(req, callback);
};


/**
 * Transforms and fetches a view through a list from the database the app
 * is running on. Results are passed to the callback, with the first
 * argument of the callback reserved for any exceptions that occurred
 * (node.js style).
 *
 * @name DB.getList(name, list, view, [q], callback)
 * @param {String} name - name of the design doc to use
 * @param {String} list - name of the list function
 * @param {String} view - name of the view to apply the list function to
 * @param {Object} q (optional)
 * @param {Function} callback(err,response)
 * @api public
 */

// TODO: run list function client-side?
DB.prototype.getList = function (name, list, view, /*optional*/q, callback) {
    if (!callback) {
        callback = q;
        q = {};
    }
    var listname = exports.encode(list);
    var viewname = exports.encode(view);
    try {
        var data = exports.stringifyQuery(q);
    }
    catch (e) {
        return callback(e);
    }
    var req = {
        url: this.url + '/_design/' + exports.encode(name) +
            '/_list/' + listname + '/' + viewname,
        data: data
    };
    exports.request(req, callback);
};

/**
 * Transforms and fetches a document through a show from the database the app
 * is running on. Results are passed to the callback, with the first
 * argument of the callback reserved for any exceptions that occurred
 * (node.js style).
 *
 * @name DB.getShow(name, show, docid, [q], callback)
 * @param {String} name - name of the design doc to use
 * @param {String} show - name of the show function
 * @param {String} docid - id of the document to apply the show function to
 * @param {Object} q (optional)
 * @param {Function} callback(err,response)
 * @api public
 */

// TODO: run show function client-side?
DB.prototype.getShow = function (name, show, docid, /*optional*/q, callback) {
    if (!callback) {
        callback = q;
        q = {};
    }
    try {
        var data = exports.stringifyQuery(q);
    }
    catch (e) {
        return callback(e);
    }
    var showname = exports.encode(show);
    var show_url = this.url + '/_design/' +
        exports.encode(name) + '/_show/' + exports.encode(showname);
    var req = {
        url: show_url + (docid ? '/' + exports.encode(docid): ''),
        data: data
    };
    exports.request(req, callback);
};


/**
 * Fetch a design document from CouchDB.
 *
 * @name DB.getDesignDoc(name, callback)
 * @param name The name of (i.e. path to) the design document without the
 *     preceeding "\_design/".
 * @param callback The callback to invoke when the request completes.
 * @api public
 */

DB.prototype.getDesignDoc = function (name, callback) {
    this.getDoc('_design/' + name, function (err, ddoc) {
        if (err) {
            return callback(err);
        }
        return callback(null, ddoc);
    });
};

/**
 * Gets information about the database.
 *
 * @name DB.info(callback)
 * @param {Function} callback(err,response)
 * @api public
 */

DB.prototype.info = function (callback) {
    var req = {
        url: this.url,
        expect_json: true,
    };
    exports.request(req, callback);
};


/**
 * Listen to the changes feed for a database.
 *
 * __Options:__
 * * _filter_ - the filter function to use
 * * _since_ - the update_seq to start listening from
 * * _heartbeat_ - the heartbeat time (defaults to 10 seconds)
 * * _include_docs_ - whether to include docs in the results
 *
 * Returning false from the callback will cancel the changes listener
 *
 * @name DB.changes([q], callback)
 * @param {Object} q (optional) query parameters (see options above)
 * @param {Function} callback(err,response)
 * @api public
 */

// TODO: change this to use an EventEmitter
DB.prototype.changes = function (/*optional*/q, callback) {
    if (!callback) {
        callback = q;
        q = {};
    }

    var that = this;

    q = q || {};
    q.feed = 'longpoll';
    q.heartbeat = q.heartbeat || 10000;

    function getChanges(since) {
        q.since = since;
        try {
            var data = exports.stringifyQuery(q);
        }
        catch (e) {
            return callback(e);
        }
        var req = {
            type: 'GET',
            expect_json: true,
            url: that.url + '/_changes',
            data: data
        };
        var cb = function (err, data) {
            var result = callback.apply(this, arguments);
            if (result !== false) {
                getChanges(data.last_seq);
            }
        }
        exports.request(req, cb);
    }

    // use setTimeout to pass control back to the browser briefly to
    // allow the loading spinner to stop on page load
    setTimeout(function () {
        if (q.hasOwnProperty('since')) {
            getChanges(q.since);
        }
        else {
            that.info(function (err, info) {
                if (err) {
                    return callback(err);
                }
                getChanges(info.update_seq);
            });
        }
    }, 0);
};


/**
 * Saves a list of documents, without using separate requests.
 * This function uses CouchDB's HTTP bulk document API (_bulk_docs).
 * The return value is an array of objects, each containing an 'id'
 * and a 'rev' field. The return value is passed to the callback you
 * provide via its second argument; the first argument of the callback
 * is reserved for any exceptions that occurred (node.js style).
 *
 * **Options:**
 * * *all_or\_nothing* - Require that all documents be saved
 *   successfully (or saved with a conflict); otherwise roll
 *   back the operation.
 *
 * @name DB.bulkSave(docs, [options], callback)
 * @param {Array} docs An array of documents; each document is an object
 * @param {Object} options (optional) Options for the bulk-save operation.
 * @param {Function} callback(err,response) - A function to accept results
 *          and/or errors. Document update conflicts are reported in the
 *          results array.
 * @api public
 */

DB.prototype.bulkSave = function (docs, /*optional*/ options, callback) {
    if (!_.isArray(docs)) {
        throw new Error(
            'bulkSave requires an array of documents to work properly'
        );
    }
    if (!callback) {
        callback = options;
        options = {};
    }
    options.docs = docs;
    try {
        var data = JSON.stringify(options);
    }
    catch (e) {
        return callback(e);
    }
    var req = {
        type: 'POST',
        url: this.url + '/_bulk_docs',
        data: data,
        processData: false,
        contentType: 'application/json',
        expect_json: true
    };
    exports.request(req, callback);
};


/**
 * Requests a list of documents, using only a single HTTP request.
 * This function uses CouchDB's HTTP bulk document API (_all_docs).
 * The return value is an array of objects, each of which is a document.
 * The return value is passed to the callback you provide via its second
 * argument; the first argument of the callback is reserved for any
 * exceptions that occurred (node.js style).
 *
 * @name DB.bulkGet(keys, [q], callback)
 * @param {Array} keys An array of documents identifiers (i.e. strings).
 * @param {Object} q (optional) Query parameters for the bulk-read operation.
 * @param {Function} callback(err,response) - A function to accept results
 *          and/or errors. Document update conflicts are reported in the
 *          results array.
 * @api public
 */

DB.prototype.bulkGet = function (keys, /*optional*/ q, callback) {
    if (keys && !_.isArray(keys)) {
        throw new Error(
            'bulkGet requires that _id values be supplied as a list'
        );
    }
    if (!callback) {
        callback = q;
        q = {};
    }

    /* Encode every query-string option:
        CouchDB requires that these be JSON, even though they
        will be URL-encoded as part of the request process. */

    try {
        for (var k in q) {
            q[k] = JSON.stringify(q[k]);
        }
    }
    catch (e) {
        return callback(e);
    }

    /* Make request:
        If we have a list of keys, use a post request containing
        a JSON-encoded list of keys. Otherwise, use a get request. */

    var req = {
        expect_json: true,
        url: this.url + '/_all_docs' + exports.escapeUrlParams(q)
    };
    if (keys) {
        try {
            var data = JSON.stringify({ keys: keys});
        }
        catch (e) {
            return callback(e);
        }
        req = _.extend(req, {
            type: 'POST',
            processData: false,
            contentType: 'application/json',
            data: data
        });
    } else {
        req = _.extend(req, {
            type: 'GET'
        });
    }

    exports.request(req, callback);
};


/**
 * DB methods can only be called client-side
 */

_.each(_.keys(DB.prototype), function (k) {
    var _fn = DB.prototype[k];
    DB.prototype[k] = function () {
        if (!isBrowser()) {
            throw new Error(k + ' cannot be called server-side');
        }
        return _fn.apply(this, arguments);
    };
});
