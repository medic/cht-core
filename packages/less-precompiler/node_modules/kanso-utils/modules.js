/**
 * Functions related to the loading and manipulation of CommonJS Modules in
 * Kanso apps.
 *
 * @module
 */

var utils = require('./utils'),
    async = require('async'),
    path = require('path'),
    fs = require('fs'),
    evals = process.binding('evals'),
    Script = evals.Script || evals.NodeScript;


// As modules are added, their original file paths are added to this object
// eg: {'lib': {'mymodule': '/home/user/project/lib/mymodule.js'}, ...}
exports.originalPaths = {};


/**
 * Add the module source to the document in the correct location for requiring
 * server-side, then add the path to the _modules property for use by the
 * modules plugin postprocessor (when creating the kanso.js attachment)
 *
 * Returns the updated document.
 *
 * @param {Object} doc
 * @param {String} path
 * @param {String} src
 * @returns {Object}
 */

exports.add = function (doc, path, src) {
    var curr = utils.getPropertyPath(doc, path, true);
    if (curr !== undefined) {
        var paths = utils.getPropertyPaths(path, curr);
        throw new Error(
            'Adding ' + path + ' would overwrite:\n' +
            '  ' + paths.join('\n  ') + '\n' +
            '\n' +
            'This error often occurs because there is a module with the\n' +
            'same name as a directory containing modules. There is no way\n' +
            'to map this structure in the design doc.\n'
        );
    }
    utils.setPropertyPath(doc, path, src);
    if (!doc._modules) {
        doc._modules = {};
    }
    doc._modules[path] = null;
    return doc;
};


/**
 * Wraps module source code with useful comments and module cache boilerplate
 * code.
 *
 * @param {Object} doc
 * @param {String} path
 * @param {String} src
 * @returns {Object}
 */

exports.wrap = function (path, src) {
    return '/********** ' + path + ' **********/\n\n' +
        'kanso.moduleCache["' + path.replace('"', '\\"') + '"] = ' +
        '{load: (function (module, exports, require) {\n\n' + src + '\n\n})};' +
        '\n\n';
};


/**
 * Searchs a path for commonjs modules, adding them to the document.
 *
 * @param {String} pkgdir - path to the source package
 * @param {String} p      - path to a module file or directory of modules
 * @param {Object} doc    - the document to extend
 * @param {Function} callback
 */

exports.addPath = function (pkgdir, p, doc, callback) {
    p = utils.abspath(p, pkgdir);
    exports.find(p, function (err, files) {
        if (err) {
            return callback(err);
        }
        async.forEach(files, function (f, cb) {
            exports.addFile(pkgdir, f, doc, cb);
        }, callback);
    });
};


/**
 * Loads a module file and adds its contents to the document
 *
 * @param {String} pkgdir
 * @param {String} p
 * @param {Object} doc
 * @param {Function} callback
 */

exports.addFile = function (pkgdir, p, doc, callback) {
    fs.readFile(p, function (err, content) {
        if (err) {
            return callback(err);
        }
        var rel = utils.relpath(p, pkgdir);
        var module_path = rel.replace(/\.js$/, '');
        var src = content.toString();
        exports.add(doc, module_path, src);
        utils.setPropertyPath(exports.originalPaths, rel, p);
        callback()
    });
};


/**
 * Find all modules below or at a given path, recursing through subdirectories
 *
 * @param {String} p - the path to search
 * @param {Function} callback
 */

exports.find = async.memoize(function (p, callback) {
    utils.find(p, exports.filenameFilter(p), callback);
});


/**
 * Creates a filter used when searching for module files. This function tests
 * for a .js extension and omits hidden dot-preceeded filenames.
 *
 * @param {String} p - the path to the directory being searched
 * @returns {Function}
 */

exports.filenameFilter = function (p) {
    return function (f) {
        if (f === p) {
            return true;
        }
        var relpath = utils.relpath(f, p);
        // should not start with a '.'
        if (/^\.[^\/]?/.test(relpath)) {
            return false;
        }
        // should not contain a file or folder starting with a '.'
        if (/\/\./.test(relpath)) {
            return false;
        }
        // should have a .js extension
        if (!/\.js$/.test(f)) {
            return false;
        }
        return true;
    };
};


/**
 * Parses the exports.originalPaths object to return an array of filenames
 */

exports.getFilenames = function (obj) {
    var names = [];
    for (var k in obj) {
        if (typeof obj[k] === 'object') {
            names.concat(exports.getFilenames(obj[k]).map(function (n) {
                return k + '/' + n;
            }));
        }
        else {
            names.push(k);
        }
    }
    return names;
};


/**
 * Loads a commonjs module from the loaded design document, returning
 * the exported properties. The current_dir and target parameters are not the
 * path of the module on the filesystem, but rather the path of the module
 * within couchdb, root ('/') being the design doc itself.
 *
 * @param {Object} module_cache
 * @param {Object} doc
 * @param {String} current_dir
 * @param {String} target
 * @param {Object} context - optional, extends sandbox object
 */

exports.require = function (module_cache, doc, current, target, context) {
    var current_dir = path.dirname(current);
    if (target.charAt(0) !== '.') {
        current_dir = '/';
    }
    var p = path.normalize(path.join(current_dir, target));
    if (module_cache[p]) {
        return module_cache[p];
    }

    var nodes = p.split('/').slice(1);
    var content = nodes.reduce(function (a, x) {
        if (a[x] === undefined) {
            throw new Error(
                //'Could not require module: ' + target + ' ' +
                'Could not require module: ' + p.replace(/^\//, '') + ' ' +
                '(from: ' + current.replace(/^\//, '') + ') - ' +
                'Module not found'
            );
        }
        a = a[x];
        return a;
    }, doc);

    var filename = utils.getPropertyPath(
        exports.originalPaths, p.substr(1), true
    );

    // if you attempt to require
    if (typeof filename === 'object') {
        var filenames = exports.getFilenames(filename);
        throw new Error(
            //'Could not require module: ' + target + ' ' +
            'Could not require module: ' + p.replace(/^\//, '') + ' ' +
            '(from: ' + current.replace(/^\//, '') + ')\n\n' +
            'It\'s not possible to require directories of modules in CouchDB,\n' +
            'you have to specify one of the following sub-modules directly:\n' +
            filenames.map(function (f) {
                return '  ' + p.replace(/^\//, '') + '/' + f;
            }).join('\n') + '\n'
        );
    }

    var module = {
        id: p.substr(1),
        exports: {},
        // TODO: this property is not provided by couchdb, but is by node:
        //filename: filename,
        // TODO: this property is not provided by couchdb, but is by node:
        //require: async.apply(exports.require, module_cache, doc, p)
        // TODO: module properties provided by couchdb, but not by kanso
        // * current
        // * parent
    };
    var sandbox = {
        module: module,
        exports: module.exports,
        //require: module.require,
        require: async.apply(exports.require, module_cache, doc, p),
        log: function () {
            console.log.apply(console, arguments);
        }
    };

    // copy context into sandbox
    if (context) {
        Object.keys(context).forEach(function (k) {
            sandbox[k] = context[k];
        });
    }

    // Create a placeholder for this module's exports so circular requires
    // are possible. TODO: node.js uses a loaded = false attribute on the
    // cached module object to mark this as a placeholder.
    module_cache[p] = {};

    try {
        var s = new Script(content, filename).runInNewContext(sandbox);
    }
    catch (e) {
        if (e instanceof SyntaxError && filename) {
            // gives a better syntax error than runInNewContext
            // with filename and line number
            require(filename);
        }
        if (!e.got_filename) {
            e.message = 'Error loading: ' + filename + '\n' + e.message;
            e.got_filename = true;
        }
        throw e;
    }
    module_cache[p] = sandbox.module.exports;
    return module_cache[p];
};
