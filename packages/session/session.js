/**
 * ## Session module
 *
 * This module contains functions related to session management. Logging in,
 * logging out and checking the current state of a user's session.
 *
 * Functions in this module follow the node.js callback style. The first
 * argument is an error object (if one occurred), the following arguments are
 * the results of the operation. The callback is always the last argument to a
 * function.
 *
 *
 * ### Events
 *
 * The session module is an EventEmitter. See the
 * [events package](http://kan.so/packages/details/events) for more information.
 *
 * #### change
 *
 * Emitted whenever a change to the user's session is detected, this
 * can occur as the result of a login/logout call or by getting the user's
 * session info (and it's changed).
 *
 * ```javascript
 * var session = require("session");
 *
 * session.on('change', function (userCtx) {
 *     // update session information, eg "Logged in as ..."
 * });
 * ```
 *
 * @module
 */


var events = require('events'),
    db = require('db');


/**
 * Quick utility function for testing if running in the browser, since
 * these functions won't run on CouchDB server-side
 */

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
 * Attempt to login using the username and password provided.
 *
 * @name login(username, password, callback)
 * @param {String} username - the username to login with
 * @param {String} password - the user's password (unhashed)
 * @param {Function} callback - function called with the result of the login
 *     attempt
 * @api public
 *
 * ```javascript
 * session.login('testuser', 'password', function (err, response) {
 *     if (err) // an error occurred logging in
 *     else     // success
 * });
 * ```
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
 * Logs out the current user.
 *
 * @name logout(callback)
 * @param {Function} callback - function called with the result of the logout
 *     attempt
 * @api public
 *
 * ```javascript
 * session.logout(function (err, response) {
 *     if (err) // an error occurred logging out
 *     else     // success
 * });
 * ```
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
 * Returns the current user's session information. The info object contains a
 * `userCtx` property and an `info` property. The first contains the name and
 * roles of the current user, the second contains information about the user
 * database and authentication handlers.
 *
 * @name info(callback)
 * @param {Function} callback - function called with the session information
 * @api public
 *
 * ```javascript
 * session.info(function (err, info) {
 *     if (err) // an error occurred getting session info
 *     else     // success
 * });
 * ```
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
