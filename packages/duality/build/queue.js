module.exports = {
    before: 'properties/load',
    run: function (root, path, settings, doc, callback) {
        doc._duality_core_load = doc._load;
        callback(null, doc);
    }
};
