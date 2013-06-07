/**
 * Module dependencies
 */

var utils = require('duality/utils'),
    dust = require('dust'),
    _ = require('underscore'),
    flashmessages;

try {
    flashmessages = require('./flashmessages');
}
catch (e) {
    // flashmessages module may not be available
}

if (!dust.optimizers) {
    dust.optimizers = {};
}

// disable whitespace compression
dust.optimizers.format = function (ctx, node) {
    return node;
};

dust.helpers.tap = function(input, chunk, context) {
    // return given input if there is no dust reference to resolve
    var output = input;
    // dust compiles a string/reference such as {foo} to function,
    if (typeof input === "function") {
        // just a plain function (a.k.a anonymous functions) in the context, not a dust `body` function created by the dust compiler
        if (input.isFunction === true) {
            output = input();
        } else {
            output = '';
            chunk.tap(function(data) {
                output += data;
                return '';
            }).render(input, context).untap();

            if (output === '') {
                output = false;
            }
        }
    }
    return output;
};

dust.helpers.tapObject = dust.helpers.tapArray = function(input, chunk, context) {
    // return given input if there is no dust reference to resolve
    var output = input;

    // dust compiles a string/reference such as {foo} to function,
    chunk.tap(function(data) {
        output = data;
        return '';
    }).render(input, context).untap();

    return output || [];
};


/**
 * Add helpers. Will override any existing helpers by the given names.
 * @param {Object} helpers
 */
exports.addHelpers = function(helpers) {
    _.extend(dust.helpers, helpers);
}

/**
 * Synchronously render dust template and return result, automatically adding
 * baseURL to the template's context. The request object is required so we
 * can determine the value of baseURL.
 *
 * @name render(name, req, context)
 * @param {String} name
 * @param {Object} req
 * @param {Object} context
 * @returns {String}
 * @api public
 */

exports.render = function (name, req, context) {
    context.baseURL = utils.getBaseURL(req);
    context.isBrowser = utils.isBrowser();
    context.userCtx = req.userCtx;
    if (!context.flashMessages && flashmessages) {
        context.flashMessages = flashmessages.getMessages(req);
    }
    var r = '';
    dust.render(name, context, function (err, result) {
        if (err) {
            throw err;
        }
        r = result;
    });
    return r;
};
