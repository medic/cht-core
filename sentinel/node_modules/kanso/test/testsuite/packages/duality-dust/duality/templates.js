/**
 * Module dependencies
 */

var utils = require('duality/utils'),
    dust = require('dust'),
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
