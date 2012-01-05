var utils = require('./utils');


module.exports = function (root, path, settings, doc, callback) {
    if (root) {
        // the root settings are added by the post processor
        return callback(null, doc);
    }
    utils.prepareDoc(doc);
    try {
        utils.addSettings(root, doc, settings);
    }
    catch (e) {
        return callback(e);
    }
    callback(null, doc);
};
