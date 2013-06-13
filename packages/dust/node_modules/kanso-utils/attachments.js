/**
 * Functions related to the loading and manipulation of attachments in
 * Kanso apps.
 *
 * @module
 */

var utils = require('./utils'),
    mime = require('mime'),
    async = require('async'),
    fs = require('fs');


/**
 *
 * @param {Object} doc
 * @param {String} path
 * @param {Buffer} content
 * @returns {Object}
 */

exports.add = function (doc, ddoc_path, original_path, content) {
    if (!(content instanceof Buffer)) {
        content = new Buffer(content);
    }
    if (!doc._attachments) {
        doc._attachments = {};
    }
    if (doc._attachments[ddoc_path]) {
        throw new Error('Attachment already exists at ' + ddoc_path);
    }
    doc._attachments[ddoc_path] = {
        'content_type': mime.lookup(original_path),
        'data': content.toString('base64'),
        // custom addition removed in cleanup postprocessor
        '_original_path': original_path
    };
    return doc;
};


/**
 * Searchs a path for attachments, adding them to the document.
 *
 * @param {String} pkgdir - path to the source package
 * @param {String} p      - path to a file or directory
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
 * Loads an attachment file and adds its contents to the document
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
        try {
            exports.add(doc, rel, p, content);
        }
        catch (e) {
            return callback(e)
        }
        callback();
    });
};


/**
 * Find all attachments below or at a given path, recursing through
 * subdirectories
 *
 * @param {String} p - the path to search
 * @param {Function} callback
 */

exports.find = async.memoize(function (p, callback) {
    utils.find(p, exports.filenameFilter(p), callback);
});


/**
 * Creates a filter used when searching for attachments. This function omits
 * hidden dot-preceeded filenames.
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
        return true;
    };
};
