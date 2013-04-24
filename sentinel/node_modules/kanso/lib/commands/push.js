var utils = require('../utils'),
    packages = require('../packages'),
    logger = require('../logger'),
    couchdb = require('../couchdb'),
    kansorc = require('../kansorc'),
    argParse = require('../args').parse,
    exec = require('child_process').exec,
    path = require('path'),
    fs = require('fs'),
    pathExists = fs.exists || path.exists,
    url = require('url'),
    urlParse = url.parse,
    urlFormat = url.format;


exports.summary = 'Load a project and push to a CouchDB database';

exports.usage = '' +
'kanso push [PATH] [DB]\n' +
'\n' +
'Parameters:\n' +
'  PATH    Path to project directory to push (defaults to ".")\n' +
'  DB      The CouchDB database to upload the app to, will use "default"\n' +
'          env set in .kansorc if none provided and .kansorc exists\n' +
'\n' +
'Options:\n' +
'  --minify    Compress CommonJS modules attachment using UglifyJS\n' +
'  --open      Open the app URL in the browser after pushing\n' +
'  --baseURL   Add a custom baseURL property to the kanso.json values\n' +
'  --id        Specify a custom document id for the generated app,\n' +
'              defaults to "_design/<name>" where <name> is from kanso.json';


/**
 * Main command called when typing "kanso push ..." on the command line
 */

exports.run = function (settings, args) {
    var a = argParse(args, {
        'minify': {match: '--minify'},
        'open': {match: '--open'},
        'baseURL': {match: '--baseURL', value: true},
        'id': {match: '--id', value: true}
    });
    var url;
    var dir = a.positional[0] || '.';
    pathExists(dir, function (exists) {
        if (!exists) {
            dir = process.cwd();
            url = a.positional[0];
        }
        dir = utils.abspath(dir);
        kansorc.extend(settings, dir + '/.kansorc', function (err, settings) {
            if (err) {
                return logger.error(err);
            }
            if (a.positional.length > 1) {
                url = a.positional[1];
            }
            else if (a.positional.length && !exists) {
                url = a.positional[0];
            }

            var env = utils.argToEnv(settings, url);
            url = env.db;
            if (env.baseURL) {
                a.options.baseURL = env.baseURL;
            }
            if (env.minify) {
                a.options.minify = env.minify;
            }
            if (env.id) {
                a.options.id = env.id;
            }

            // these options will override values in kanso.json
            // the 'id' and 'open' options are not relevant to that data
            var opt = env.overrides || {};
            opt.minify = a.options.minify;
            opt.baseURL = a.options.baseURL;

            exports.loadApp(dir, url, opt, settings,
                function (err, url, cfg, doc) {
                    if (err) {
                        return logger.error(err);
                    }
                    var app_url = exports.getAppURL(url, cfg, doc);
                    var noauth_url = utils.noAuthURL(app_url);

                    if (a.options.open) {
                        exports.openInBrowser(app_url, function (err) {
                            if (err) {
                                return logger.error(err);
                            }
                            logger.end(noauth_url);
                        });
                    }
                    else {
                        logger.end(noauth_url);
                    }
                }
            );
        });
    });
};


/**
 * Builds the app prior to pushing
 */

exports.loadApp = function (dir, url, options, settings, callback) {
    var paths = settings.package_paths || [];
    var parent_dir = path.dirname(dir);
    if (path.basename(parent_dir) === 'packages') {
        paths.push(parent_dir);
    }
    var build_start = new Date().getTime();
    packages.load(dir, paths, null, options, function (err, doc, cfg) {
        if (err) {
            if (callback) {
                return callback(err);
            }
            else {
                return logger.error(err);
            }
        }
        var build_end = new Date().getTime();
        console.log('Build complete: ' + (build_end - build_start) + 'ms');
        utils.completeAuth(url, false, function (err, url) {
            if (err) {
                return callback(err);
            }
            utils.catchAuthError(
                exports.push, url, [dir, options, cfg, doc], callback
            );
        });
    });
};


/**
 * Upload the app to the DB, catch auth errors and prompt for password
 */

exports.push = function (url, dir, options, cfg, doc, callback) {
    var db = couchdb(url);
    var root = couchdb(url);
    root.instance.pathname = '';
    root.session(function (err, info, resp) {
        if (err) {
            return callback(err);
        }
        var server_time = utils.ISODateString(new Date(resp.headers.date));
        if (!doc.kanso) {
            doc.kanso = {};
        }
        doc.kanso.push_time = server_time;
        doc.kanso.pushed_by = info.userCtx.name;

        db.ensureDB(function (err) {
            if (err) {
                return callback(err);
            }
            var id = options.id || '_design/' + cfg.name;
            logger.info('Uploading...');

            db.save(id, doc, {force: true}, function (err) {
                callback(err, url, cfg, doc);
            });
        });
    });
};


/**
 * Tries to determine the right URL to report on the command-line after a
 * successful push
 *
 * OK: <url>
 */

exports.getAppURL = function (url, cfg, doc) {
    var newurl= urlParse(url);
    delete newurl.auth;
    delete newurl.host;
    var ddoc_url = urlFormat(newurl) + '/' + doc._id;

    if (!/^_design\//.test(doc._id)) {
        // not pushed as a design doc, report doc url instead of app url
        return ddoc_url;
    }

    var app_url = ddoc_url;
    if (cfg.index) {
        // if there's an index property in kanso.json
        app_url = ddoc_url + cfg.index;
    }
    if (cfg.baseURL !== undefined) {
        // if there is a custom baseURL defined
        newurl.pathname = cfg.baseURL + '/';
        app_url = urlFormat(newurl);
    }
    else if (doc.rewrites && doc.rewrites.length) {
        app_url = ddoc_url + '/_rewrite/';
    }
    else if (doc._attachments && doc._attachments['index.html']) {
        app_url = ddoc_url + '/index.html';
    }
    else if (doc._attachments && doc._attachments['index.htm']) {
        app_url = ddoc_url + '/index.htm';
    }
    return app_url;
};


/**
 * Opens the app URL in the browser when the --open option is used
 */

exports.openInBrowser = function (url, callback) {
    if (process.platform === 'linux') {
        cmd = 'xdg-open';
    }
    else {
        // OSX
        cmd = 'open';
    }
    console.log('Opening URL in browser...');
    exec(cmd + ' ' + url, callback);
};
