var utils = require('./utils'),
    async = require('async');


/**
 * Loads templates registered on the design doc by the
 * preprocessors and appends them to the dust.js module.
 */

module.exports = {
    before: 'modules/attachment',
    run: function (root, path, settings, doc, callback) {
        if (doc._dust) {
            utils.addTemplates(doc, doc._dust.templates, function (err) {
                if (err) {
                    return callback(err);
                }
                delete doc._dust;
                callback(err, doc);
            });
        }
        else {
            callback(null, doc);
        }
    }
};
