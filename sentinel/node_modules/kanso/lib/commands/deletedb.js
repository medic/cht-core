var utils = require('../utils'),
    logger = require('../logger'),
    couchdb = require('../couchdb'),
    kansorc = require('../kansorc'),
    argParse = require('../args').parse,
    url = require('url'),
    urlParse = url.parse,
    urlFormat = url.format;


exports.summary = 'Delete a CouchDB database';

exports.usage = '' +
'kanso deletedb DB\n' +
'\n' +
'Where DB is either a URL to the desired DB, the name of a database\n' +
'you\'d like to delete on localhost:5984, or an evironment name in\n' +
'your .kansorc:\n' +
'\n' +
'kanso deletedb dbname\n' +
'kanso deletedb user@dbname\n' +
'kanso deletedb user:password@dbname\n' +
'kanso deletedb http://hostname:port/dbname\n' +
'kanso deletedb http://user:password@hostname:port/dbname\n' +
'kanso deletedb environment\n' +
'\n' +
'Parameters:\n' +
'  DB      The URL or name of the CouchDB database to delete'


exports.run = function (settings, args) {
    var a = argParse(args, {});

    if (!a.positional.length) {
        logger.error('Missing DB argument');
        console.log('USAGE: ' + exports.usage);
        return;
    }

    kansorc.extend(settings, './.kansorc', function (err, settings) {
        if (err) {
            return logger.error(err);
        }

        async.forEachSeries(a.positional, function (arg, cb) {
            utils.catchAuthError(
                exports.deletedb, utils.argToEnv(settings, arg).db, [], cb
            )
        },
        function (err) {
            if (err) {
                return logger.error(err);
            }
            logger.end();
        });

    });
};

exports.deletedb = function (url, callback) {
    utils.completeAuth(url, false, function (err, url) {
        if (err) {
            return logger.error(err);
        }
        logger.info('deleting', utils.noAuthURL(url));
        var db = couchdb(url);
        db.deleteDB(callback);
    });
};
