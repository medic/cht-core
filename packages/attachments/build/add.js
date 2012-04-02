var attachments = require('kanso-utils/attachments'),
    async = require('async');


/**
 * Loads attachment directories specified in kanso.json and adds the attachments
 * to the document.
 */

module.exports = function (root, path, settings, doc, callback) {
    var paths = settings.attachments || [];
    if (!Array.isArray(paths)) {
        paths = [paths];
    }
    async.forEachLimit(paths, 20, function (p, cb) {
        attachments.addPath(path, p, doc, cb);
    },
    function (err) {
        callback(err, doc);
    });
};
