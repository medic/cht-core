var modules = require('kanso/modules');

/**
 * Wraps the settings JSON as a CommonJS Module and includes in the document
 * so package config is easily available in the CommonJS environment.
 */

function add_settings(root, doc, settings, name) {
    name = name || 'packages/' + settings.name;
    var json = JSON.stringify(settings);
    var path = 'settings/' + name;
    var src = 'module.exports = ' + json + ';';
    modules.add(doc, path, src);
    if (root) {
        if (doc.settings.root) {
            // root settings already defined
            throw new Error('Root settings conflict');
        }
        modules.add(doc, 'settings/root', 'module.exports = require("' +
            path.replace('"', '\\"') +
        '");');
    }
    return doc;
}

module.exports = function (root, path, settings, doc, callback) {
    if (!doc.settings) {
        doc.settings = {};
    }
    if (!doc.settings.packages) {
        doc.settings.packages = {};
    }
    try {
        add_settings(root, doc, settings);
    }
    catch (e) {
        return callback(e);
    }
    callback(null, doc);
};
