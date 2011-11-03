/**
 * Validation functions used to validate Field contents.
 *
 * @module
 */

var _ = require('underscore')._;


/**
 * Tests that the field's value is greater than 'min'.
 *
 * @name min(min)
 * @param {Number} min
 * @returns {Function}
 * @api public
 */

exports.min = function (min) {
    return function (doc, value) {
        if (value < min) {
            throw new Error(
                'Please enter a value greater than or equal to ' + min
            );
        }
    };
};

/**
 * Tests that the field's value is less than 'max'
 *
 * @name max(max)
 * @param {Number} max
 * @returns {Function}
 * @api public
 */

exports.max = function (max) {
    return function (doc, value) {
        if (value > max) {
            throw new Error(
                'Please enter a value less than or equal to ' + max
            );
        }
    };
};

/**
 * Tests that the field's value is greater than 'min' AND less than 'max'
 *
 * @name range(min, max)
 * @param {Number} min
 * @param {Number} max
 * @returns {Function}
 * @api public
 */

exports.range = function (min, max) {
    return function (doc, value) {
        if (value < min || value > max) {
            throw new Error(
                'Please enter a value between ' + min + ' and ' + max
            );
        }
    };
};

/**
 * Tests that the field's value length is greater than 'val'
 *
 * @name minlength(val)
 * @param {Number} val
 * @returns {Function}
 * @api public
 */

exports.minlength = function (val) {
    return function (doc, value) {
        if (value.length < val) {
            throw new Error('Please enter at least ' + val + ' characters');
        }
    };
};

/**
 * Tests that the field's value length is less than 'val'
 *
 * @name maxlength(val)
 * @param {Number} val
 * @returns {Function}
 * @api public
 */

exports.maxlength = function (val) {
    return function (doc, value) {
        if (value.length > val) {
            throw new Error('Please enter no more than ' + val + ' characters');
        }
    };
};

/**
 * Tests that the field's value length is greater than 'min' AND less than 'max'
 *
 * @name rangelength(min, max)
 * @param {Number} min
 * @param {Number} max
 * @returns {Function}
 * @api public
 */

exports.rangelength = function (min, max) {
    return function (doc, value) {
        if (value.length < min || value.length > max) {
            throw new Error(
                'Please enter a value between ' + min + ' and ' + max +
                ' characters long'
            );
        }
    };
};

/**
 * Tests field's value against a regular expression
 *
 * @name regexp(re, message)
 * @param {RegExp} re - can be a string or RegExp object
 * @param {String} message - (optional) a custom error message to throw
 * @returns {Function}
 * @api public
 */

exports.regexp = function (re, message) {
    re = (typeof re === 'string') ? new RegExp(re): re;
    return function (doc, value) {
        if (!re.test(value)) {
            throw new Error(message || 'Invalid format');
        }
    };
};

/**
 * Tests that field's value is a valid email address using a regular expression.
 *
 * @name email()
 * @returns {Function}
 * @api public
 */

exports.email = function () {
    // regular expression by Scott Gonzalez:
    // http://projects.scottsplayground.com/email_address_validation/
    return exports.regexp(new RegExp("^((([a-z]|\\d|[!#\\$%&'\\*\\+\\-\\/=\\?\\^_`{\\|}~]|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])+(\\.([a-z]|\\d|[!#\\$%&'\\*\\+\\-\\/=\\?\\^_`{\\|}~]|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])+)*)|((\\x22)((((\\x20|\\x09)*(\\x0d\\x0a))?(\\x20|\\x09)+)?(([\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x7f]|\\x21|[\\x23-\\x5b]|[\\x5d-\\x7e]|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])|(\\\\([\\x01-\\x09\\x0b\\x0c\\x0d-\\x7f]|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF]))))*(((\\x20|\\x09)*(\\x0d\\x0a))?(\\x20|\\x09)+)?(\\x22)))@((([a-z]|\\d|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])|(([a-z]|\\d|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])([a-z]|\\d|-|\\.|_|~|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])*([a-z]|\\d|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])))\\.)+(([a-z]|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])|(([a-z]|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])([a-z]|\\d|-|\\.|_|~|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])*([a-z]|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])))\\.?$", "i"), 'Please enter a valid email address');
};

/**
 * Tests that field's value is a valid URL using a regular expression.
 *
 * @name url()
 * @returns {Function}
 * @api public
 */

exports.url = function () {
    // regular expression by Scott Gonzalez:
    // http://projects.scottsplayground.com/iri/
    return exports.regexp(new RegExp("^(https?|ftp):\\/\\/(((([a-z]|\\d|-|\\.|_|~|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])|(%[\\da-f]{2})|[!\\$&'\\(\\)\\*\\+,;=]|:)*@)?(((\\d|[1-9]\\d|1\\d\\d|2[0-4]\\d|25[0-5])\\.(\\d|[1-9]\\d|1\\d\\d|2[0-4]\\d|25[0-5])\\.(\\d|[1-9]\\d|1\\d\\d|2[0-4]\\d|25[0-5])\\.(\\d|[1-9]\\d|1\\d\\d|2[0-4]\\d|25[0-5]))|((([a-z]|\\d|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])|(([a-z]|\\d|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])([a-z]|\\d|-|\\.|_|~|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])*([a-z]|\\d|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])))\\.)+(([a-z]|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])|(([a-z]|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])([a-z]|\\d|-|\\.|_|~|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])*([a-z]|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])))\\.?)(:\\d*)?)(\\/((([a-z]|\\d|-|\\.|_|~|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])|(%[\\da-f]{2})|[!\\$&'\\(\\)\\*\\+,;=]|:|@)+(\\/(([a-z]|\\d|-|\\.|_|~|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])|(%[\\da-f]{2})|[!\\$&'\\(\\)\\*\\+,;=]|:|@)*)*)?)?(\\?((([a-z]|\\d|-|\\.|_|~|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])|(%[\\da-f]{2})|[!\\$&'\\(\\)\\*\\+,;=]|:|@)|[\\uE000-\\uF8FF]|\\/|\\?)*)?(\\#((([a-z]|\\d|-|\\.|_|~|[\\u00A0-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF])|(%[\\da-f]{2})|[!\\$&'\\(\\)\\*\\+,;=]|:|@)|\\/|\\?)*)?$", "i"), 'Please enter a valid URL');
};

/**
 * Detects embedded documents with missing _id properties and returns an
 * array of Error objects for each occurence. Returns an empty array if
 * all documents have a populated _id property.
 *
 * Used by the EmbeddedList field type.
 *
 * @name missingIDs()
 * @param {Object} doc
 * @param {Array} value
 * @returns {Array}
 * @api public
 */

exports.missingIDs = function () {
    return function (doc, value) {
        var errs = [];
        _.each(value, function (v, i) {
            if (!v._id) {
                var e = new Error('Embedded document missing _id');
                e.field = [i];
                errs.push(e);
            }
        });
        return errs;
    };
};

