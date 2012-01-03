var less = require('less'),
    async = require('async'),
    utils = require('kanso-utils/utils'),
    spawn = require('child_process').spawn,
    path = require('path');


function compileLess(project_path, filename, settings, callback) {
    // we get a rather cryptic error when trying to compile a file that doesn't
    // exist, so check early for that and report something sensible
    path.exists(filename, function (exists) {
        if (!exists) {
            return callback(new Error('File does not exist: ' + filename));
        }
        console.log('Compiling ' + utils.relpath(filename, project_path));
        var args = [filename];
        if (settings.less.compress) {
            args.unshift('--compress');
        }
        var lessc = spawn(__dirname + '/../node_modules/less/bin/lessc', args);

        var css = '';
        var err_out = '';
        lessc.stdout.on('data', function (data) {
            css += data;
        });
        lessc.stderr.on('data', function (data) {
            err_out += data;
        });
        lessc.on('exit', function (code) {
            if (code === 0) {
                callback(null, css);
            }
            else {
                callback(new Error(err_out));
            }
        });
    });
};

module.exports = function (root, path, settings, doc, callback) {
    if (!settings.less || !settings.less.compile) {
        return callback(null, doc);
    }
    var paths = settings.less.compile || [];
    if (!Array.isArray(paths)) {
        paths = [paths];
    }
    async.forEach(paths, function (p, cb) {
        var name = p.replace(/\.less$/, '.css');
        var filename = utils.abspath(p, path);
        compileLess(path, filename, settings, function (err, css) {
            if (err) {
                return cb(err);
            }
            doc._attachments[name] = {
                content_type: 'text/css',
                data: new Buffer(css).toString('base64')
            };
            cb();
        });
    },
    function (err) {
        if (settings.less.remove_from_attachments) {
            for (var k in (doc._attachments || {})) {
                if (/\.less$/.test(k)) {
                    delete doc._attachments[k];
                }
            }
        }
        callback(err, doc);
    });
};
