/*global $: false, kanso: true*/

/**
 * Implementation of widget actions. These are procedures
 * that can be referenced by widgets to present/collect information,
 * manipulate the DOM, or otherwise affect the application state
 * when a widget is acted upon.
 *
 * @module
 */

/**
 * Module dependencies
 */

var utils = require('couchtypes/utils'),
    sanitize = require('sanitize'),
    _ = require('underscore')._;

var h = sanitize.escapeHtml;


/**
 * Create a closure that loads {module}, and invokes {method}
 * on it. The {options} parameter is prepenced to the method's
 * argument list. This separate function silences a lint warning.
 * See the parse method for details.
 */

exports.make_action_handler = function (module, method, options) {
    return function () {
        var args = [ options ].concat(
            Array.prototype.slice.apply(arguments)
        );
        return require(module)[method].apply(null, args);
    };
};


/**
 * Convert an object containing several [ module, callback ] or
 * { module: x, callback: y } items in to an object containing
 * several native javascript functions, by using require.
 *
 * @param actions An object, containing items describing a
 *          function that can be obtained via require().
 */

exports.parse = function (actions) {
    var rv = {};
    for (var k in actions) {
        var module, callback, options;
        var action = actions[k];
        if (action === false) {
            rv[k] = utils.emptyFunction;
        } else {
            if (_.isArray(action)) {
                module = action[0];
                callback = action[1];
                options = action[2];
            } else if (_.isFunction(action)) {
                rv[k] = action;
                continue;
            } else if (typeof(action) === 'object') {
                module = action.module;
                callback = action.callback;
                options = action.options;
            } else {
                throw new Error(
                    'Action `' + k + '` is `' + typeof(action) + '`, ' +
                        "which this function doesn't know how to interpret"
                );
            }
            /* Resolve function description to actual function */
            rv[k] = exports.make_action_handler(module, callback, options);
        }
    }
    return rv;
};

