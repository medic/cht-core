/**
 * Functions related to the management of user sessions and account information.
 *
 * @module
 */

/**
 * Module dependencies
 */

var events = require('events'),
    users = require('users'),
    db = require('db');


function isBrowser() {
    return (typeof(window) !== 'undefined');
}

/**
 * When a db call results in an unauthorized response, the user's session is
 * checked to see if their session has timed out or they've logged out in
 * another screen.
 *
 * This check is throttled to once per second, to avoid flooding the server if
 * multiple requests are made with incorrect permissions.
 */

var last_session_check = 0;

db.on('unauthorized', function (req) {
    // db call returned 'Unauthorized', check the user's session if it's not
    // been checked on an 'Unauthorized' repsonse in the last second
    if (last_session_check < new Date().getTime() - 1000) {
        exports.info();
    }
});


/**
 * This module is an EventEmitter, used for handling 'change' events
 */

var exports = module.exports = new events.EventEmitter();


/**
 * Logs out the current user.
 *
 * @name logout(callback)
 * @param {Function} callback
 * @api public
 */

exports.logout = function (callback) {
    if (!isBrowser()) {
        throw new Error('logout cannot be called server-side');
    }
    db.request({
        type: "DELETE",
        url: "/_session", // don't need baseURL, /_session always available
        username: "_",
        password : "_"
    },
    function (err, resp) {
        if (resp && resp.ok) {
            exports.userCtx = {name: null, roles: []};
            exports.session = {userCtx: exports.userCtx};
            exports.emit('change', exports.userCtx);
        }
        if (callback) {
            callback(err, resp);
        }
    });
};

/**
 * Attempt to login using the username and password provided.
 *
 * @name login(username, password, callback)
 * @param {String} username
 * @param {String} password
 * @param {Function} callback
 * @api public
 */

exports.login = function (username, password, callback) {
    if (!isBrowser()) {
        throw new Error('login cannot be called server-side');
    }
    db.request({
        type: "POST",
        url: "/_session",
        data: {name: username, password: password}
    },
    function (err, resp) {
        if (resp && resp.ok) {
            // TODO: for some reason resp.name is set to null in the response
            // even though the roles are correct for the user! Look into this
            // and see if its a bug in couchdb, for now, just using the username
            // given to the login function instead, since we know the login
            // request was accepted.
            exports.userCtx = {name: username, roles: resp.roles};
            exports.session = {userCtx: exports.userCtx};
            exports.emit('change', exports.userCtx);
        }
        if (callback) {
            callback(err, resp);
        }
    });
};


/**
 * Returns the current user's session information.
 *
 * @name info(callback)
 * @param {Function} callback
 * @api public
 */

exports.info = function (callback) {
    if (!isBrowser()) {
        throw new Error('info cannot be called server-side');
    }
    db.request({
        type: "GET",
        url: "/_session"
    },
    function (err, resp) {
        var oldUserCtx = exports.userCtx;
        exports.session = resp;
        exports.userCtx = (resp && resp.userCtx) || {name: null, roles: []};
        // TODO: should this check for differences in more than just name?
        if (!oldUserCtx || oldUserCtx.name !== exports.userCtx.name) {
            exports.emit('change', exports.userCtx);
        }
        if (callback) {
            callback(err, resp);
        }
    });
};


/**
 * Creates a new user document with given username and password.
 *
 * @name signup(username, password, callback, options)
 * @param {String} username
 * @param {String} password
 * @param {Array} roles
 * @param {Function} callback
 * @param {Hash} options
 * @api public
 */

exports.signup = function (username, password, roles, callback) {
    if (!isBrowser()) {
        throw new Error('signup cannot be called server-side');
    }
    users.create(username, password, roles, callback);
};
