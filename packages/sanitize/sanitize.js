/**
 * Input sanitization, escaping, and construction functions
 * covering security-sensitive areas.
 *
 * @module
 */

/**
 * Module dependencies
 */

var _ = require('underscore')._;

/**
 *
 * @name escapeUrlParams(s)
 * @param {Object} obj An object containing url parameters, with
 *          parameter names stored as property names (or keys).
 * @returns {String}
 * @api public
 */

exports.escapeUrlParams = exports.url = function (obj)
{
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
 * Encodes required characters as HTML entities so a string
 * can be included in a page. This function must be used to
 * avoid Cross-site Scripting attacks.
 *
 * @name escapeHtml(s)
 * @param {String} s
 * @returns {String}
 * @api public
 */

exports.escapeHtml = exports.h = function (s)
{
    s = ('' + s); /* Coerce to string */
    s = s.replace(/&/g, '&amp;');
    s = s.replace(/</g, '&lt;');
    s = s.replace(/>/g, '&gt;');
    s = s.replace(/"/g, '&quot;');
    s = s.replace(/'/g, '&#39;');
    return s;
};


/**
 * Encodes selected characters in a string, so that the string
 * can be safely used within a Javascript string constant. This
 * function must be used to avoid cross-site scripting attacks
 * (or, in some cases, arbitrary server-side code execution).
 *
 * @name escapeJavascriptString(s)
 * @param {String} s
 * @returns {String}
 * @api public
 */

exports.escapeJavascriptString = exports.js = function (s)
{
    s = ('' + s); /* Coerce to string */
    s = s.replace(/'/g, "\\'");
    s = s.replace(/"/g, '\\"');
    return s;
};


/**
 * Encodes selected characters in a string, so that the string
 * can be safely used within an XML character data section.
 * This function must be used to avoid cross-site scripting attacks.
 *
 * @name escapeXmlCharacterData(s)
 * @param {String} s
 * @returns {String}
 * @api public
 */

exports.escapeXmlCharacterData = exports.cdata = function (s)
{
    s = ('' + s); /* Coerce to string */
    s = s.replace(/\]\]>/g, '');
    return s;
};


/**
 * Encodes selected characters in a string, so that the string
 * can be safely used on the right side of a CSS attribute selector's
 * equal sign. This function should be used when using a user-modifiable
 * string to match an element by attribute -- either in jQuery, or as part
 * of a dynamically-generated CSS selector.
 *
 * @name escapeAttributeSelectorValue(s)
 * @param {String} s
 * @returns {String}
 * @api public
 */

exports.escapeAttributeSelectorValue = exports.css = function (s)
{
    s = ('' + s); /* Coerce to string */
    s = s.replace(/['"\\=\[\]]/, '\\$1');
    return s;
};


/**
 * Takes any number of arguments, and combines them together
 * to safely form a string that's suitable for use as an
 * identifier or name.
 *
 * @name generateAbstractIdentifier(rv, args, esc_fn, final_fn)
 * @param {Array} rv An accumulator array, used to store results.
 * @param {Array} args An array of arguments to the id-generating function.
 * @param {Array} esc_fn An input-sanitizing function, to be applied to
 *          each component of the identifier before it's emitted.
 * @param {Array} join_fn A function that accepts an array of sanitized
 *          identifier components, and produces a string.
 * @returns {String}
 */

exports.generateAbstractIdentifier = function (rv, args, esc_fn, join_fn) {
    if (args.length <= 0) {
        return null;
    }
    for (var i = 0, len = args.length; i < len; ++i) {
        var arg = args[i];
        if (arg !== undefined && arg !== null) {
            if (_.isArray(arg)) {
                /* Avoid recursion; limit to one level deep */
                for (var j = 0, lenj = arg.length; j < lenj; ++j) {
                    if (arg[j] !== undefined && arg[j] !== null) {
                        rv.push(esc_fn(arg[j]));
                    }
                }
            } else {
                rv.push(esc_fn(arg));
            }
        }
    }
    return join_fn(rv);
};


/**
 * Takes any number of arguments, and combines them together
 * to safely form a string that's suitable for use as a DOM
 * element identifier.
 *
 * @name generateDomIdentifier()
 * @returns {String}
 * @api public
 */

exports.generateDomIdentifier = exports.id = function (/* ... */) {
    return exports.generateAbstractIdentifier(
        [ 'id' ], arguments, function (x) {
            return ('' + x).replace(/[^A-Za-z0-9_]+/, '_');
        }, function (x) {
            return x.join('_');
        }
    );
};


/**
 * Takes any number of arguments, and combines them together
 * to safely form a string that's suitable for use in a DOM
 * element's name attribute.
 *
 * @name generateDomName()
 * @returns {String}
 * @api public
 */

exports.generateDomName = exports.name = function (/* ... */) {
    return exports.generateAbstractIdentifier(
        [ ], arguments, function (x) {
            return ('' + x).replace(/[\'\"]+/, '_');
        }, function (x) {
            return x.join('.');
        }
    );
};
