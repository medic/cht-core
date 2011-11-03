/**
 * A browser CouchDB library for managing users
 *
 * @module
 */

/**
 * Module dependencies
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
 * @name sanitizeArguments(username, password, properties, callback, callback2)
 * @param {String} username
 * @param {String} password
 * @param {Hash} properties
 * @param {Function} callback
 * @param {Function} callback2
 * @api private
 */

var sanitizeArguments = function(username, password, properties, callback, callback2) {
    if (!callback) {
        callback = properties;
        properties = [];
    }
    
    if (!properties.roles) {
        properties.roles = [];
    }
    
    callback2(username, password, properties, callback);
};


/**
 * Deletes an existing user document, given its username. You
 * must be logged in as an administrative user for this function
 * to succeed.
 *
 * @name delete(username, callback)
 * @param {String} username
 * @param {Function} callback
 * @api public
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
 * Get a single user by username.
 *
 * @name get(username, callback)
 * @param {String} username
 * @param {Function} callback
 * @api public
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
 * Lists users.
 *
 * @name list(callback)
 * @param {Function} callback
 * @api public
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
 * If first given role in the properties is _admin, 
 * user will be made admin.
 *
 * @name create(username, password, properties, callback)
 * @param {String} username
 * @param {String} password
 * @param {Hash} properties
 * @param {Function} callback
 * @api public
 */

exports.create = function (username, password, properties, callback) {
    sanitizeArguments(username, password, properties, callback, 
        function(username, password, properties, callback) {
            if (properties.roles[0] == "_admin") {
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
 * Update the user.
 *
 * @name update(username, password, properties, callback)
 * @param {String} username
 * @param {String} password
 * @param {Hash} properties
 * @param {Function} callback
 * @api public
 */

exports.update = function (username, password, properties, callback) {
    sanitizeArguments(username, password, properties, callback, 
        function(username, password, properties, callback) {    
            exports.get(username, function (err, user, options) {
                if (err) {
                    return callback(err);
                }
                if (properties.roles[0] != "_admin") {
                    _.extend(user, properties);
                }
                if (password) {
                    user.password_sha = sha1.hex(password + user.salt);
                }

                saveUser(options.authdb, user, function (err, user) {
                    if (properties.roles[0] == "_admin") {
                        createAdmin(username, password, function () {
                            callback();
                        });
                    }
                    else {
                        getAdmin(username, function(err, admin) {
                            if (err) {
                                if (err.status !== 404) {
                                    return callback(err);
                                }
                                return callback();
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
