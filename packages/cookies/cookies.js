/*global escape: false */

/**
 * Functions related to the manipulation and reading of cookies.
 *
 * @module
 */

function isBrowser() {
    return (typeof(window) !== 'undefined');
}


/**
 * Read cookies currently stored in the browser, returning an object
 * keyed by cookie name.
 *
 * @name readBrowserCookies()
 * @returns Object
 * @api public
 */

exports.readBrowserCookies = function () {
    if (!isBrowser()) {
        throw new Error('readBrowserCookies cannot be called server-side');
    }
    var cookies = {};
    var parts = document.cookie.split(';');
    for (var i = 0, len = parts.length; i < len; i++) {
        var name = parts[i].split('=')[0];
        var value = parts[i].split('=').slice(1).join('=');
        cookies[name] = value;
    }
    return cookies;
};

/**
 * Reads browser cookies and returned the value of the named cookie.
 *
 * @name readBrowserCookie(name)
 * @returns {String}
 * @api public
 */

exports.readBrowserCookie = function (name) {
    return exports.readBrowserCookies()[name];
};

/**
 * Creates a string for storing a cookie on the browser.
 *
 * @name cookieString(req, opt)
 * @param {Request Object} req
 * @param {Object} opt
 * @returns {String}
 * @api public
 */

exports.cookieString = function (req, opt) {
    var str = escape(opt.name) + '=' + escape(opt.value) + '; path=' + opt.path;
    if (opt.days) {
        var expires = new Date();
        expires.setTime(
            new Date().getTime() + 1000 * 60 * 60 * 24 * opt.days
        );
        str += '; expires=' + expires.toGMTString();
    }
    return str;
};

/**
 * Sets a cookie on the browser, for use client-side only.
 *
 * @name setBrowserCookie(req, opt)
 * @param {Request Object} req
 * @param {Object} opt
 * @api public
 */

exports.setBrowserCookie = function (req, opt) {
    if (!isBrowser()) {
        throw new Error('setBrowserCookie cannot be called server-side');
    }
    var str = (typeof opt === 'string') ? opt: exports.cookieString(req, opt);
    //console.log('document.cookie = ' + str);
    document.cookie = str;
};

/**
 * Creates a Set-Cookie header on a response object.
 *
 * @name setResponseCookie(req, res, opt)
 * @param {Request Object} req
 * @param {Response Object} res
 * @param {Object} opt
 * @api public
 */

exports.setResponseCookie = function (req, res, opt) {
    var str = (typeof opt === 'string') ? opt: exports.cookieString(req, opt);
    if (typeof res !== 'object') {
        res = {code: 200, body: res};
    }
    if (!res.headers) {
        res.headers = {};
    }
    // TODO: is it possible to send multiple set-cookie headers by turning
    // headers into an array like in node?
    // XXX: just replacing all cookies for now - not ideal!
    res.headers['Set-Cookie'] = str;
};
