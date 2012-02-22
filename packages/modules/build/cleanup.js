module.exports = {
    after: 'modules/attachment',
    run: function (root, path, settings, doc, callback) {
        delete doc._modules;
        delete doc._module_paths;
        return callback(null, doc);
    }
};
