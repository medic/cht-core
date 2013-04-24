module.exports = function (root, path, settings, doc, callback) {
    if (!doc.names) {
        doc.names = [];
    }
    doc.names.push(settings.name);
    callback(null, doc);
};
