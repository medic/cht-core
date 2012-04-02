/*global window: false, __duality_current_request: true*/


/**
 * General utility functions used by duality. Some functions were moved here
 * from other modules (such as core), to avoid a circular dependency bug in
 * CouchDB.
 *
 * This module also stores some useful properties such as 'isBrowser', which is
 * true if the code is running in a browser environment, and 'initial_hit' which
 * is set to true when a page is first requested from CouchDB (and set to false
 * for subsequent requests).
 *
 * @module
 */

/**
 * Module dependencies
 */

var settings = require('settings/root'), // settings module is auto-generated
    cookies = require('cookies'),
    _ = require('underscore')._;


/**
 * Some functions calculate results differently depending on the execution
 * environment. The isBrowser value is used to set the correct environment
 * for these functions, and is only exported to make unit testing easier.
 */

exports.isBrowser = function () {
    return (typeof(window) !== 'undefined');
};

/**
 * Keeps track of the last *triggered* request. This is to avoid a race
 * condition where two link clicks in quick succession can cause the rendered
 * page to not match the current URL. If the first link's document or view takes
 * longer to return than the second, the URL was updated for the second link
 * click but the page for the first link will render last, overwriting the
 * correct page. Now, callbacks for fetching documents and views check against
 * this value to see if they should continue rendering the result or not.
 */

exports.currentRequest = function (v) {
    if (v) {
        __duality_current_request = v;
    } else if (typeof(__duality_current_request) === 'undefined') {
        __duality_current_request = null;
    }
    return __duality_current_request;
};


/**
 * This is because the first page hit also triggers duality to handle the url
 * client-side. Knowing it is the first page being loaded means we can stop
 * the pageTracker code from submitting the URL twice. Exported because this
 * might be useful information to other modules, it should not be modified
 * by them.
 */

// TODO: this was moved to this module from core.js to avoid a circular
// dependency between core.js and session.js

exports.initial_hit = true;

/**
 * Used to store userCtx, periodically updated like on session.login and
 * session.logout.
 */

// TODO: added to utils to avoid circular dependency bug in couchdb

exports.userCtx = null;

/**
 * Caches extended session info (like the current authentication db) after
 * a call to session.info
 */
exports.session = null;

/**
 * This is used to make unit testing in the browser easier.
 * Because it can be overridden without actually changing the window's location.
 * (and navigating away from the test suite)
 */

exports.getWindowLocation = function () {
    return window.location;
};

/**
 * Returns the path to prefix to any URLs. When running behind a
 * virtual host, there is nothing to prefix URLs with. When accessing the
 * app directly, URLs need to be prefixed with /db/_design/appname/_rewrite.
 *
 * The request object argument is only required when run server-side, but its
 * a good idea to include it whenever you call getBaseURL.
 *
 * @name getBaseURL(req)
 * @param {Object} req
 * @returns {String}
 * @api public
 */

// TODO: this was moved to this module from core.js to avoid a circular
// dependency between core.js and db.js ...once circular dependencies in
// couchdb's commonjs implementation are fixed it can be moved back into
// core.js. For now, this is also exported from core.js and should
// be accessed from there.

exports.getBaseURL = function (/*optional*/req) {
    if (!req) {
        req = exports.currentRequest();
    }
    if ('baseURL' in settings) {
        return settings.baseURL;
    }
    if (exports.isBrowser()) {

        var baseURL = cookies.readBrowserCookie('baseURL');
        if (baseURL) return baseURL;

        var re = new RegExp('(.*\\/_rewrite).*$');
        var match = re.exec(exports.getWindowLocation().pathname);
        if (match) {
            return match[1];
        }
        return '';
    }
    if (req.query.baseURL) {
        return req.query.baseURL;
    }
    if (req.query.db && req.query.ddoc) {
        return '/' + req.query.db + '/_design/' + req.query.ddoc + '/_rewrite/';
    }

    if (_.include(req.path, '_rewrite')) {
        return '/' + req.path.slice(0, 3).join('/') + '/_rewrite';
    }
    if (req.headers['x-couchdb-vhost-path']) {
        return '';
    }
    return '/' + req.path.slice(0, 3).join('/') + '/_rewrite';
};

/**
 * Creates CouchDB response object for returning from a show, list or update
 * function, which redirects to the given app url (automatically prepending the
 * baseURL)
 *
 * @name redirect(req, url)
 * @param {Object} req
 * @param {String} url
 * @returns {Object}
 * @api public
 */

exports.redirect = function (/*optional*/req, url) {
    url = url || '/';
    var baseURL = exports.getBaseURL(req);
    return {code: 302, headers: {'Location': baseURL + url}};
};
