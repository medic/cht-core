module.exports = function (root, path, settings, doc, callback) {
    doc.postprocessor_run = true;
    callback(null, doc);
};
