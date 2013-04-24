var utils = require('../utils'),
    packages = require('../packages'),
    logger = require('../logger'),
    couchdb = require('../couchdb'),
    kansorc = require('../kansorc'),
    argParse = require('../args').parse,
    path = require('path');


exports.summary = 'Load a project and output resulting JSON';

exports.usage = '' +
'kanso show [PATH]\n' +
'\n' +
'Parameters:\n' +
'  PATH    Path to project directory to show (defaults to ".")\n' +
'\n' +
'Options:\n' +
'  --minify    Compress CommonJS modules attachment using UglifyJS';


exports.run = function (settings, args) {
    var a = argParse(args, {
        'minify': {match: '--minify'},
        'baseURL': {match: '--baseURL', value: true}
    });
    var dir = utils.abspath(a.positional[0] || '.');
    kansorc.extend(settings, dir + '/.kansorc', function (err, settings) {
        if (err) {
            return logger.error(err);
        }
        if (a.options.hasOwnProperty('baseURL')) {
            settings.baseURL = a.options.baseURL;
        }
        if (settings.hasOwnProperty('minify')) {
            settings.minify = a.options.minify;
        }

        // suppress logger output
        logger.level = 'error';

        // avoid writing to stdout
        var stdout_getter = process.__lookupGetter__('stdout');
        var tmp_stdout = fs.createWriteStream('/dev/null');
        process.__defineGetter__('stdout', function () {
            return tmp_stdout;
        });

        exports.loadApp(dir, a.options, settings, function (err, doc, cfg) {
            // reinstate stdout getter
            process.__defineGetter__('stdout', stdout_getter);

            if (err) {
                return logger.error(err);
            }
            logger.clean_exit = true;
            console.log(JSON.stringify(doc, null, 4));
        });
    });
};

exports.loadApp = function (dir, options, settings, callback) {
    var paths = settings.package_paths || [];
    var parent_dir = path.dirname(dir);
    if (path.basename(parent_dir) === 'packages') {
        paths.push(parent_dir);
    }
    packages.load(dir, paths, null, options, callback);
};
