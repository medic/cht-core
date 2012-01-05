var async = require('async'),
    utils = require('kanso-utils/utils'),
    dust = require('dust'),
    fs = require('fs'),
    _ = require('underscore')._;


// disable whitespace compression
dust.optimizers.format = function (ctx, node) {
    return node;
};


exports.registerTemplates = function (dir, doc, p, callback) {
    if (!doc._dust) {
        doc._dust = {};
    }
    if (!doc._dust.templates) {
        doc._dust.templates = {};
    }
    var p = utils.abspath(p, dir);
    exports.find(p, function (err, files) {
        if (err) {
            return callback(err);
        }
        _.each(files, function (file) {
            var rel = utils.relpath(file, p);
            var abs = utils.abspath(file, p);
            doc._dust.templates[rel] = abs;
        });
        callback(null, doc);
    });
};

exports.addTemplates = function (doc, templates, callback) {
    async.forEach(_.keys(templates || {}), function (k, cb) {
        var file = templates[k];
        fs.readFile(file, function (err, content) {
            if (err) {
                return cb(err);
            }
            doc.dust += dust.compile(content.toString(), k);
            cb();
        });
    }, callback);
};

exports.find = function (p, callback) {
    utils.find(p, exports.filenameFilter(p), callback);
};

exports.filenameFilter = function (p) {
    return function (f) {
        var relpath = utils.relpath(f, p);
        // should not start with a '.'
        if (/^\./.test(relpath)) {
            return false;
        }
        // should not contain a file or folder starting with a '.'
        if (/\/\./.test(relpath)) {
            return false;
        }
        return true;
    };
};
