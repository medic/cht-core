/**
 * ## Users module
 *
 * Functions for querying, creating, updating and deleting user documents.
 *
 * Functions in this module follow the node.js callback style. The first
 * argument is an error object (if one occurred), the following arguments are
 * the results of the operation. The callback is always the last argument to a
 * function.
 *
 * @module
 */


var db = require('db'),
    sha1 = require('sha1'),
    _ = require('underscore')._;


/**
 * Returns the authentication database for the current user's session.
 *
 * @name authdb(callback)
 * @param {Function} callback
 * @api private
 */

var authdb = function(callback) {
    db.request({
        type: "GET",
        url: "/_session"
    },
    function (err, resp) {
        if (err) {
            return callback(err, null);
        }
        callback(null, resp.info.authentication_db);
    });
};


/**
 * Returns successful if username is in admin database.
 *
 * @name getAdmin(username, callback)
 * @param {String} username
 * @param {Function} callback
 * @api private
 */

var getAdmin = function(username, callback) {
    db.request({
        type: 'GET',
        url: '/_config/admins/' + username,
        contentType: 'application/json'
    }, callback);
};


/**
 * Delete user from user database.
 *
 * @name deleteUser(authdb, id, user, callback)
 * @param {String} user database
 * @param {String} user id
 * @param {Object} user document
 * @param {Function} callback
 * @api private
 */

var deleteUser = function(authdb, id, user, callback) {
    db.request({
        type: 'DELETE',
        url: '/' + db.encode(authdb) + '/' + db.encode(id) +
             '?rev=' + db.encode(user._rev),
        contentType: 'application/json'
    }, callback);
};

/**
 * Delete user from admin database.
 *
 * @name deleteAdmin(username, callback)
 * @param {String} username
 * @param {Function} callback
 * @api private
 */

var deleteAdmin = function(username, callback) {
    db.request({
        type: 'DELETE',
        url: '/_config/admins/' + username,
        contentType: 'application/json'
    }, callback);
};


/**
 * Save user to user database.
 *
 * @name saveUser(authdb, doc, callback)
 * @param {String} user database
 * @param {Object} user document
 * @param {Function} callback
 * @api private
 */

var saveUser = function(authdb, doc, callback) {
    var url = '/' + authdb + '/' + doc._id;
    var req = {
        type: 'PUT',
        url: url,
        data: JSON.stringify(doc),
        processData: false,
        contentType: 'application/json'
    };
    db.request(req, callback);
};


/**
 * Create a new user in the user database.
 *
 * @name createUser(username, password, properties, callback)
 * @param {String} username
 * @param {String} password
 * @param {Hash} properties
 * @param {Function} callback
 * @api private
 */

var createUser = function(username, password, properties, callback) {
    var doc = {};
    doc._id = 'org.couchdb.user:' + username;
    doc.name = username;
    doc.type = 'user';

    _.extend(doc, properties);

    db.newUUID(100, function (err, uuid) {
        if (err) {
            return callback(err);
        }
        doc.salt = uuid;
        doc.password_sha = sha1.hex(password + doc.salt);

        authdb(function (err, authdb) {
            if (err) { return callback(err); }
            saveUser(authdb, doc, callback);
        });
    });
};


/**
 * Create a new user in the admin database.
 *
 * @name createAdmin(username, password, callback)
 * @param {String} username
 * @param {String} password
 * @param {Function} callback
 * @api private
 */

var createAdmin = function(username, password, callback) {
    var url = '/_config/admins/' + username;
    var req = {
        type: 'PUT',
        url: url,
        data: JSON.stringify(password),
        processData: false,
        contentType: 'application/json'
    };
    db.request(req, callback);
};


/**
 * Sanitize the arguments by allowing to omit the properties and
 * predefining the roles if they're not set.
 *
 * @name sanitizeArguments(username, password, properties, cb, cb2)
 * @param {String} username
 * @param {String} password
 * @param {Hash} properties
 * @param {Function} cb
 * @param {Function} cb2
 * @api private
 */

var sanitizeArguments = function(username, password, properties, cb, cb2) {
    if (!cb) {
        cb = properties;
        properties = {};
    }
    if (!properties.roles) {
        properties.roles = [];
    }
    cb2(username, password, properties, cb);
};


/**
 * Deletes an existing user document, given its username. You
 * must be logged in as an administrative user for this function
 * to succeed.
 *
 * @name delete(username, callback)
 * @param {String} username - The username of the user to delete
 * @param {Function} callback(err,response) - Function called on completion of
 *     the operation
 * @api public
 *
 * ```javascript
 * users.delete('username', function (err) {
 *     if (err) // there was an error deleting the user
 *     else     // success
 * });
 * ```
 */

exports.delete = function (username, callback) {
    exports.get(username, function(err, user, options) {
        if (err) { return callback(err); }

        getAdmin(username, function(err, admin) {
            if (err) {
                if (err.status !== 404) {
                    return callback(err);
                }
                deleteUser(options.authdb, options.id, user, callback);
            }
            else {
                deleteAdmin(username, function(err) {
                    if (err) {
                        return callback(err);
                    }
                    deleteUser(options.authdb, options.id, user, callback);
                });
            }
        });
    });
};


/**
 * Get a single user by username. The third argument to the callback is an info
 * object which returns the authdb used, and the real id of the user with
 * "org.couchdb.user:" prefix.
 *
 * @name get(username, callback)
 * @param {String} username - The username of the user to get
 * @param {Function} callback(err,user,info) - Function called on completion
 * @api public
 *
 * ```javascript
 * users.get('testuser', function (err, doc) {
 *     if (err) // there was an error fetching the user document
 *     else     // success
 * });
 * ```
 */

exports.get = function(username, callback) {
    var id = 'org.couchdb.user:' + username;

    authdb(function (err, authdb) {
        if (err) {
            return callback(err);
        }
        db.request({
            type: 'GET',
            url: '/' + db.encode(authdb) + '/' + db.encode(id),
            contentType: 'application/json'
        },
        function (err, user) {
            callback(err, user, {authdb: authdb, id: id});
        });
    });
};


/**
 * List users in the auth database. By default, it will list all users.
 * By using the optional `q` parameter, you can pass additional options to the
 * `_all_docs` view for the auth database.
 *
 * @name list([q], callback)
 * @param {Object} q - Query parameters (optional)
 * @param {Function} callback(err,list) - Function called with the resulting
 *     list (or error)
 * @api public
 *
 * ```javascript
 * users.list(function (err, list) {
 *     if (err) // there was an error querying the auth database
 *     else     // success
 * });
 * ```
 */

exports.list = function(q, callback) {
    if (!callback) {
        callback = q;
        q = {};
    }
    if (!q.startkey) {
        q.startkey = '"org.couchdb.user:"';
    }
    if (!q.endkey) {
        q.endkey = '"org.couchdb.user_"';
    }
    authdb(function (err, authdb) {
        if (err) {
            callback(err, null);
        }
        var req = {
            type: 'GET',
            url: '/' + db.encode(authdb) + '/_all_docs',
            data: db.stringifyQuery(q),
            expect_json: true
        };
        db.request(req, function(err, result) {
            if (err) {
                return callback(err, null);
            }
            var users = _(result.rows).select(function(row) {
                return row.id.match(/^org\.couchdb\.user/);
            });
            callback(null, users);
        });
    });
};


/**
 * Creates a new user document with given username and password.
 * If properties.roles contains '_admin', user will be made admin.
 *
 * @name create(username, password, [properties], callback)
 * @param {String} username - The username of the new user
 * @param {String} password - The unhashed password for the new user
 * @param {Object} properties - Additional properties such as roles to extend
 *     the user document with (optional)
 * @param {Function} callback(err,response) - Function called on completion or
 *     error
 * @api public
 *
 * ```javascript
 * users.create('testuser', 'testing', {roles: ['example']}, function (err) {
 *     if (err) // an error occurred
 *     else     // successfully created new user
 * });
 * ```
 */

exports.create = function (username, password, properties, callback) {
    sanitizeArguments(username, password, properties, callback,
        function(username, password, properties, callback) {
            if (_.indexOf(properties.roles, "_admin") !== -1) {
                createAdmin(username, password, function (err) {
                    if (err) {
                        return callback(err);
                    }
                    properties.roles = [];
                    createUser(username, password, properties, callback);
                });
            }
            else {
                createUser(username, password, properties, callback);
            }
    });
};


/**
 * Updates an existing user document. Similar usage to the create function.
 *
 * @name update(username, password, properties, callback)
 * @param {String} username - The username of the new user
 * @param {String} password - The unhashed password for the new user
 * @param {Object} properties - Additional properties such as roles to extend
 *     the user document with (optional)
 * @param {Function} callback(err,response) - Function called on completion or
 *     error
 * @api public
 *
 * ```javascript
 * users.update('testuser', 'testing', {roles: ['example']}, function (err) {
 *     if (err) // an error occurred
 *     else     // successfully updated user
 * });
 * ```
 */

exports.update = function (username, password, properties, callback) {
    sanitizeArguments(username, password, properties, callback,
        function(username, password, properties, callback) {
            exports.get(username, function (err, user, options) {
                if (err) {
                    return callback(err);
                }
                if (_.indexOf(properties.roles, "_admin") === -1) {
                    _.extend(user, properties);
                }
                if (password) {
                    user.password_sha = sha1.hex(password + user.salt);
                }

                saveUser(options.authdb, user, function (err, user) {
                    if (_.indexOf(properties.roles, "_admin") !== -1) {
                        createAdmin(username, password, function () {
                            callback(null, user);
                        });
                    }
                    else {
                        getAdmin(username, function(err, admin) {
                            if (err) {
                                if (err.status !== 404) {
                                    return callback(err);
                                }
                                return callback(null, user);
                            }
                            else {
                                deleteAdmin(username, callback);
                            }
                        });
                    }
                });
            });
    });
};
