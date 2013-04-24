/**
 * Contains functions for querying and setting data
 * related to replication operations in CouchDB.
 *
 * @module
 */

/**
 * Module dependencies
 */

var db = require('db'),
    _ = require('underscore')._;


/**
 * Fetches the most recent revision of the replication document
 * referred to by the id parameter.
 *
 * If you're running behind a virtual host you'll need to set up
 * appropriate rewrites to /_replicator, which will also mean turning
 * off safe rewrites.
 *
 * This function only works with CouchDB >= 1.1, since it uses the
 * _replicator database.
 *
 * @name get(id, callback)
 * @param {String} id
 * @param {Function} callback
 * @api public
 */

exports.get = function (id, callback) {
    var req = {
        url: '/_replicator/' + db.encode(id),
        cache: false /* Work around IE7 issue */
    };
    db.request(req, callback);
};

/**
 * Replicates options.source to options.target. The strings
 * options.source and options.target are each either a
 * CouchDB database name or a CouchDB database URI.
 *
 * If you're running behind a virtual host you'll need to set up
 * appropriate rewrites to /_replicator, which will also mean turning
 * off safe rewrites.
 *
 * This function only works with CouchDB >= 1.1, since it uses the
 * _replicator database.
 *
 * @name start(options, callback)
 * @param {Object} options
 * @param {Function} callback
 * @api public
 */

exports.start = function (options, callback) {
    if (!options.source) {
        throw new Error('source parameter must be provided');
    }
    if (!options.target) {
        throw new Error('target parameter must be provided');
    }
    var req = {
        type: 'POST',
        url: '/_replicator',
        data: JSON.stringify(options),
        contentType: 'application/json'
    };
    db.request(req, callback);
};

/**
 * Waits for a replication operation to enter a specific state.
 * waitReplication polls the _replication database using the
 * doc provided, and evaluates state_function(doc) at each iteration.
 * This function stops polling and invokes callback when the
 * state_function evaluates to true. If state_function is not
 * provided, waitReplication waits for the doc's _replication_state
 * to change from 'triggered' to 'completed' (or 'error').
 *
 * If you're running behind a virtual host you'll need to set up
 * appropriate rewrites to /_replicator, which will also mean turning
 * off safe rewrites.
 *
 * This function only works with CouchDB >= 1.1, since it uses the
 * _replicator database.
 *
 * @name wait(doc, [options, state_function], callback)
 * @param {Object} doc
 * @param {Function} state_function (optional)
 * @param {Function} callback
 * @api public
 */

exports.wait = function (doc, /*opt*/options, /*opt*/state_function, callback) {
    var default_state_function = function (recent_doc, initial_doc) {
        return (
          recent_doc._replication_state === 'completed' ||
              recent_doc._replication_state === 'error'
        );
    };
    if (!callback) {
        if (!state_function) {
            /* Arity = 2: doc, callback */
            callback = options;
            options = {};
            state_function = default_state_function;
        } else {
            /* Arity = 3: doc, options, callback */
            callback = state_function;
            state_function = default_state_function;
        }
    }
    if (options === undefined) {
        options = {};
    }
    if (options.limit === undefined) {
        options.limit = 100; /* times */
    }
    if (options.delay === undefined) {
        options.delay = 2000; /* ms */
    }

    /* Fetch latest revision */
    exports.get(doc.id, function (err, rv) {

        /* Check for error, then for an interesting event */
        if (err || state_function(rv, doc)) {
            return callback(err, rv, doc);
        }
        /* Termination condition for recursion... */
        if (options.limit > 0) {

            /* ...with well-defined progress toward it */
            options.limit -= 1;

            /* Go around */
            return setTimeout(function () {
                return exports.wait(
                    doc, options, state_function, callback
                );
            }, options.delay);
        }
    });
};

/**
 * Stops a replication operation already in progress.
 * The doc parameter can be obtained by calling replication.get.
 *
 * If you're running behind a virtual host you'll need to set up
 * appropriate rewrites to /_replicator, which will also mean turning
 * off safe rewrites.
 *
 * This function only works with CouchDB >= 1.1, since it uses the
 * _replicator database.
 *
 * @name stop(doc, callback, [options])
 * @param {String} id
 * @param {Function} callback
 * @param {Function} options
 * @api public
 */

exports.stop = function (doc, callback, /*optional*/options) {
    if (options === undefined) {
        options = {};
    }
    if (options.limit === undefined || options.limit === null) {
        options.limit = 3; /* times */
    }
    if (options.delay === undefined || options.delay === null) {
        options.delay = 500; /* ms */
    }

    var req = {
        type: 'DELETE',
        url: '/_replicator/' +
          db.encode(doc._id) +
          '?rev=' + db.encode(doc._rev)
    };

    db.request(req, function (err, rv) {

        if (err && err.status === 409) {  /* Document update conflict */

            /* Race condition:
                The CouchDB replication finished (or was updated) between
                the caller's replication.get and now. Subject to restrictions
                in options, call replication.get and then try again. */

            /* Termination condition for recursion... */
            if (options.limit > 0) {

                /* ...with well-defined progress toward it */
                options.limit -= 1;

                return exports.get(doc._id, function (e, d) {
                    if (e) {
                        throw new Error(
                          'The specified replication document changed ' +
                          'since last read, and we failed to re-request it'
                        );
                    }
                    /* Go around */
                    setTimeout(function () {
                        return exports.stop(d, callback, options);
                    }, options.delay);
                });
            }

        } else {

            /* Normal case:
                Replication document was not changed since the last
                read; go ahead and invoke the callback and return. */

            return callback(err, rv);
        }

        /* Not reached */
        return false;

    });

};


/**
 * Calls old /_replicator API
 */

exports._replicate = function (options, callback) {
    var req = {
        type: 'POST',
        url: '/_replicate',
        contentType: 'application/json',
        data: JSON.stringify(options)
    };
    db.request(req, callback);
};


/**
 * replication methods cannot be called server-side
 */

_.each(_.keys(exports), function (k) {
    var _fn = module.exports[k];
    module.exports[k] = function () {
        if (typeof(window) === 'undefined') {
            throw new Error(k + ' cannot be called server-side');
        }
        return _fn.apply(this, arguments);
    }
});
