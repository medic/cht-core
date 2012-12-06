// store the load property from kanso.json for later use in the postprocessor
module.exports = function (root, path, settings, doc, callback) {
    if (!doc._load) {
        doc._load = {};
    }
    if (settings.load) {
        doc._load[settings.name] = settings;
    }
    callback(null, doc);
};
