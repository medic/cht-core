var attachments = require('kanso-utils/attachments'),
    async = require('async');


/**
 * Loads attachment directories specified in kanso.json and adds the attachments
 * to the document.
 */

module.exports = function (root, path, settings, doc, callback) {
    if (!doc._attachments) {
        return callback(null, doc);
    }
    for (var k in doc._attachments) {
        delete doc._attachments[k]._original_path;
    }
    callback(null, doc);
};
