var utils = require('../utils'),
    logger = require('../logger'),
    couchdb = require('../couchdb'),
    kansorc = require('../kansorc'),
    argParse = require('../args').parse,
    url = require('url'),
    urlParse = url.parse,
    urlFormat = url.format;


exports.summary = 'Create a new CouchDB database';

exports.usage = '' +
'kanso createdb DB\n' +
'\n' +
'Where DB is either a URL to the desired DB, the name of a database\n' +
'you\'d like to create on localhost:5984, or an evironment name in\n' +
'your .kansorc:\n' +
'\n' +
'kanso createdb dbname\n' +
'kanso createdb user@dbname\n' +
'kanso createdb user:password@dbname\n' +
'kanso createdb http://hostname:port/dbname\n' +
'kanso createdb http://user:password@hostname:port/dbname\n' +
'kanso createdb environment\n' +
'\n' +
'Parameters:\n' +
'  DB      The URL or name of the CouchDB database to create'


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
                exports.createdb, utils.argToEnv(settings, arg).db, [], cb
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

exports.createdb = function (url, callback) {
    utils.completeAuth(url, false, function (err, url) {
        if (err) {
            return logger.error(err);
        }
        logger.info('creating', utils.noAuthURL(url));
        var db = couchdb(url);
        db.createDB(callback);
    });
};
