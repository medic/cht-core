var modules = require('kanso-utils/modules');


/**
 * Ensure expected properties exist on doc
 */

exports.prepareDoc = function (doc) {
    if (!doc.settings) {
        doc.settings = {};
    }
    if (!doc.settings.packages) {
        doc.settings.packages = {};
    }
    return doc;
};


/**
 * Wraps the settings JSON as a CommonJS Module and includes in the document
 * so package config is easily available in the CommonJS environment.
 */

exports.addSettings = function (root, doc, settings, name) {
    name = name || 'packages/' + settings.name;
    // do not write url and utils anywhere, but preserve them.
    var _url = settings._url;
    var _utils = settings._utils;
    delete settings._url;
    delete settings._utils;
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
    settings._url = _url;
    settings._utils = _utils;
    return doc;
};
