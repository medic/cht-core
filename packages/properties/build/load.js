var modules = require('kanso/modules'),
    logger = require('kanso/logger'),
    utils = require('kanso/utils'),
    _ = require('underscore/underscore')._;


var proxyFn = function (path, app, doc, props) {
    var str = 'function(){return require("' + path.replace('"', '\\"') + '")';
    for (var i = 0; i < props.length; i++) {
        str += '["' + props[i].replace('"', '\\"') + '"]';
    }
    str += '.apply(this, arguments);}';
    utils.setPropertyPath(doc, props.join('/'), str);
};

var proxyFns = function (path, app, doc, prop) {
    if (app[prop]) {
        for (var k in app[prop]) {
            if (app[prop].hasOwnProperty(k)) {
                proxyFn(path, app, doc, [prop, k]);
            }
        }
    }
};

var load = function (module_cache, doc, settings, name) {
    var p = settings.load;
    var app = modules.require(module_cache, doc, '/', p);

    for (var k in app) {
        if (app.hasOwnProperty(k)) {
            if (doc[k] && typeof doc[k] === 'object' &&
                app[k] && typeof app[k] === 'object') {
                // extend exisiting object
                for (var k2 in app[k]) {
                    doc[k][k2] = app[k][k2];
                }
            }
            else {
                if (doc[k] && doc[k] !== app[k]) {
                    logger.debug('Existing value', doc[k].toString());
                    logger.debug('New value', app[k].toString());
                    throw new Error(
                        'Conflicting property values for "' + k + '"' +
                        ' caused by ' + name
                    );
                }
                doc[k] = app[k];
            }
        }
    }

    // if undefined or null, assume default value of 'true'
    if (settings.proxy_functions !== false) {
        proxyFns(p, app, doc, 'shows');
        proxyFns(p, app, doc, 'lists');
        proxyFns(p, app, doc, 'updates');
        proxyFns(p, app, doc, 'filters');
        if (app.hasOwnProperty('validate_doc_update')) {
            proxyFn(p, app, doc, ['validate_doc_update']);
        }
    }

    return doc;
};

/**
 * Loads module directories specified in kanso.json and adds the modules
 * to the document.
 */

module.exports = function (root, path, settings, doc, callback) {
    var module_cache = {};
    for (var k in doc._load) {
        if (doc._load[k] && doc._load[k].load) {
            try {
                load(module_cache, doc, doc._load[k], k);
            }
            catch (e) {
                return callback(e);
            }
        }
    }
    doc.rewrites = _.flatten(doc.rewrites);
    delete doc._load;
    callback(null, doc);
};
