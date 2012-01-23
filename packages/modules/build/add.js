var async = require('async'),
    modules = require('kanso-utils/modules');


/**
 * Loads module directories specified in kanso.json and adds the modules
 * to the document.
 */

module.exports = function (root, path, settings, doc, callback) {
    var paths = settings.modules || [];
    if (!Array.isArray(paths)) {
        paths = [paths];
    }
    async.forEachLimit(paths, 10, function (p, cb) {
        modules.addPath(path, p, doc, cb);
    },
    function (err) {
        callback(err, doc);
    });
};
