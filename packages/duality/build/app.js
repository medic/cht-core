var apputils = require('./apputils'),
    modules = require('kanso-utils/modules'),
    _ = require('underscore')._;

/**
 * Loads module directories specified in kanso.json and adds the modules
 * to the document.
 */

function load(module_cache, doc, settings) {
    var p = settings.load;
    var app = modules.require(module_cache, doc, '/', p);

    apputils.proxyFns(p, app, doc, 'shows', apputils.proxyShowFn);
    apputils.proxyFns(p, app, doc, 'lists', apputils.proxyListFn);
    apputils.proxyFns(p, app, doc, 'updates', apputils.proxyUpdateFn);
    apputils.proxyFns(p, app, doc, 'filters');
    if (app.hasOwnProperty('validate_doc_update')) {
        apputils.proxyFn(p, app, doc, ['validate_doc_update']);
    }
    return doc;
};

// TODO: loop through doc._duality_core_load keys and update each like above,
// see packages/load postprocessor for more details

module.exports = {
    after: 'properties/load',
    run: function (root, path, settings, doc, callback) {
        var module_cache = {};

        for (var k in doc._duality_core_load) {
            if (doc._duality_core_load[k] && doc._duality_core_load[k].load) {

                // check that this package wants its exports wrapped by duality
                if ('duality' in doc._duality_core_load[k].dependencies || {}) {
                    try {
                        load(module_cache, doc, doc._duality_core_load[k]);
                    }
                    catch (e) {
                        return callback(e);
                    }
                }

            }
        }

        // prepend required duality rewrites and flatten
        doc.rewrites = _.flatten([
            {from: '/modules.js', to: 'modules.js'},
            {from: '/duality.js', to: 'duality.js'},
            {from: '/_db/*', to: '../../*'},
            {from: '/_db', to: '../..'}
        ].concat(doc.rewrites || []));

        delete doc._duality_core_load;
        callback(null, doc);
    }
};
