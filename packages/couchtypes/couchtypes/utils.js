/**
 * General utility functions used by CouchTypes modules.
 *
 * @module
 */


/**
 * Module dependencies
 */

var _ = require('underscore')._;


/**
 * Some functions calculate results differently depending on the execution
 * environment. The isBrowser value is used to set the correct environment
 * for these functions, and is only exported to make unit testing easier.
 */

exports.isBrowser = function () {
    return (typeof(window) !== 'undefined');
};


/**
 * A named empty function. Use this when you wish to take
 * no action for a callback or string-generating  function.
 */

exports.emptyFunction = function ()
{
    return '';
};

/**
 * Traverses an object and its sub-objects using an array of property names.
 * Returns the value of the matched path, or undefined if the property does not
 * exist.
 *
 * If a string if used for the path, it is assumed to be a path with a single
 * key (the given string).
 *
 * <pre>
 * getPropertyPath({a: {b: 'foo'}}, ['a','b']) -> 'foo'
 * getPropertyPath({a: {b: 'foo'}}, 'a') -> {b: 'foo'}
 * </pre>
 *
 * @name getPropertyPath(obj, path)
 * @param {Object} obj
 * @param {Array|String} path
 * @api public
 */

exports.getPropertyPath = function (obj, path) {
    if (!_.isArray(path)) {
        path = [path];
    }
    if (!path.length || !obj) {
        return obj;
    }
    return exports.getPropertyPath(obj[path[0]], path.slice(1));
};

/**
 * Traverses an object and its sub-objects using an array of property names.
 * Sets the value of the matched property.
 *
 * If a string if used for the path, it is assumed to be a path with a single
 * key (the given string).
 *
 * <pre>
 * setPropertyPath({}, ['a','b'], 'foo') -> {a: {b: 'foo'}}
 * setPropertyPath({}, 'a', 'foo') -> {a: 'foo'}
 * </pre>
 *
 * @name setPropertyPath(obj, path, val)
 * @param {Object} obj
 * @param {Array|String} path
 * @api public
 */

exports.setPropertyPath = function (obj, path, val) {
    if (!_.isArray(path)) {
        path = [path];
    }
    if (!path.length) {
        throw new Error('No property path given');
    }
    if (path.length === 1) {
        obj[path[0]] = val;
        return;
    }
    var next = path[0];
    path = path.slice(1);
    if (obj[next] === undefined) {
        obj[next] = {};
    }
    else if (typeof obj[next] !== 'object' && path.length) {
        throw new Error('Property path conflicts with existing value');
    }
    exports.setPropertyPath(obj[next], path, val);
};

/**
 * Call function with arguments, catch any errors and add to an array,
 * returning the modified array.
 *
 * @param {Array} arr
 * @param {Function} fn
 * @param {Array} args
 * @returns {Array}
 * @api private
 */

exports.getErrors = function (fn, args) {
    var arr = [];
    try {
        arr = arr.concat(fn.apply(this, args) || []);
    }
    catch (e) {
        arr.push(e);
    }
    return arr;
};

/**
 * Parse CSV strings into an array of rows, each row an array of values.
 * Used by the array field's default CSV widget.
 *
 * @name parseCSV(csvString)
 * @param {String} csvString
 * @returns {Array}
 * @api public
 */

// Parsing comma-separated values (CSV) in JavaScript by M. A. SRIDHAR
// http://yawgb.blogspot.com/2009/03/parsing-comma-separated-values-in.html
exports.parseCSV = function (csvString) {
    var fieldEndMarker  = /([,\015\012] *)/g;
    var qFieldEndMarker = /("")*"([,\015\012] *)/g;
    var startIndex = 0;
    var records = [], currentRecord = [];
    do {
        var ch = csvString.charAt(startIndex);
        var endMarkerRE = (ch === '"') ? qFieldEndMarker : fieldEndMarker;
        endMarkerRE.lastIndex = startIndex;
        var matchArray = endMarkerRE.exec(csvString);
        if (!matchArray || !matchArray.length) {
            break;
        }
        var endIndex = endMarkerRE.lastIndex;
        endIndex -= matchArray[matchArray.length - 1].length;
        var match = csvString.substring(startIndex, endIndex);
        if (match.charAt(0) === '"') {
            match = match.substring(1, match.length - 1).replace(/""/g, '"');
        }
        currentRecord.push(match);
        var marker = matchArray[0];
        if (marker.indexOf(',') < 0) {
            records.push(currentRecord);
            currentRecord = [];
        }
        startIndex = endMarkerRE.lastIndex;
    } while (true);
    if (startIndex < csvString.length) {
        var remaining = csvString.substring(startIndex).trim();
        if (remaining) {
            currentRecord.push(remaining);
        }
    }
    if (currentRecord.length > 0) {
        records.push(currentRecord);
    }
    return records;
};

/**
 * Tests if path b is equal to or a sub-path of a.
 *
 * @name isSubPath(a, b)
 * @param {Array} a
 * @param {Array} b
 * @returns {Boolean}
 * @api public
 */

exports.isSubPath = function (a, b) {
    for (var i = 0, len = a.length; i < len; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
};

/**
 * Return a title-case version of the supplied string.
 * @name titleize(str)
 * @param str The string to transform.
 * @returns {String}
 * @api public
 */

exports.titleize = function (str) {
    return (str || '').toLowerCase().replace(/_+/, ' ').replace(
        /(?:^|\s+)\w/g, function (m) {
            return m.toUpperCase();
        }
    );
};

/**
 * Returns a function that executes {closure} in the context of {context}.
 * Use this function if you'd like to preserve the current context
 * across callbacks, event handlers, and other cases where the value of
 * {this} is set for you. If you're coming from the Prototype framework,
 * this function is similar to bind() there.
 *
 * @name bindContext(context, closure)
 * @param {Object} context The context to use when executing closure.
 *          Usually, you will specify the current value of 'this'.
 * @param {Function} closure The function to to bind to {context}.
 * @api public
 */

exports.bindContext = function (context, closure) {
    return function () {
        return closure.apply(context, arguments);
    };
};


/**
 * Returns attachments below a given path from a document, returning an object
 * with the attachment names relative to that path. Example:
 *
 *     var doc = {_attachments: {
 *         'foo/bar.ext': {data: 'one', ...},
 *         'foo/baz.ext': {data: 'two', ...},
 *         'asdf.ext':    {data: 'blah', ...}
 *     }};
 *
 *     utils.attachmentsBelowPath(doc, 'foo') => {
 *         'bar.ext': {data: 'one', ...},
 *         'baz.ext': {data: 'two', ...}
 *     }
 *
 * @name attachmentsBelowPath(doc, path)
 * @param {Object} doc
 * @param {String | Array} path
 * @api public
 */

exports.attachmentsBelowPath = function (doc, path) {
    if (!doc || !doc._attachments) {
        return {};
    }
    if (_.isArray(path)) {
        path = path.join('/');
    }
    var results = {};
    for (var k in doc._attachments) {
        if (k.substr(0, path.length + 1) === path + '/') {
            results[k.substr(path.length + 1)] = doc._attachments[k];
        }
    };
    return results;
};
