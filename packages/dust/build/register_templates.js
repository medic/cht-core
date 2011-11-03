var utils = require('./utils'),
    async = require('async');


/**
 * Registers templates on the design doc so they can be loaded at the post
 * processor stage.
 */

module.exports = function (root, dir, settings, doc, callback) {
    if (settings.dust && settings.dust.templates) {
        var path = settings.dust.templates;
        if (Array.isArray(path)) {
            return callback(new Error(
                'Only one template directory may be specified'
            ));
        }
        return utils.registerTemplates(dir, doc, path, callback);
    }
    callback(null, doc);
};
