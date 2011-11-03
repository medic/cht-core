/**
 * Removes the types property from the design doc, since the admin app expects
 * the types to be exported from the root module (meaning they'll get copied to
 * the design doc by the properties package).
 */

module.exports = {
    after: 'properties',
    run: function (root, path, settings, doc, callback) {
        delete doc.types;
        callback(null, doc);
    }
};
