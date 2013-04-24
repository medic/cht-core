var utils = require('../utils'),
    logger = require('../logger'),
    couchdb = require('../couchdb'),
    kansorc = require('../kansorc'),
    argParse = require('../args').parse,
    async = require('async'),
    util = require('util');


exports.summary = 'Exchange data between databases';

exports.usage = '' +
'kanso replicate SOURCE TARGET\n' +
'\n' +
'Databases can be specified using a full URL, just a name for a database\n' +
'on localhost:5984, or by an environment (in your .kansorc).\n' +
'\n' +
'Parameters:\n' +
'  SOURCE    The database to replicate from\n' +
'  TARGET    The database to replicate to\n' +
'\n' +
'Options:\n' +
'  --push    Use push instead of pull replication';


exports.run = function (settings, args, commands) {
    var a = argParse(args, {
        'push': {match: ['--push']}
    });

    if (a.positional.length < 1) {
        logger.error('Missing SOURCE database');
        console.log(exports.usage);
        return;
    }
    if (a.positional.length < 2) {
        logger.error('Missing TARGET database');
        console.log(exports.usage);
        return;
    }

    exports.init(settings, a, function (err, source, target, settings) {
        if (err) {
            return logger.error(err);
        }
        logger.info('source', utils.noAuthURL(source));
        logger.info('target', utils.noAuthURL(target));

        // push or pull replication?
        var replicator = couchdb.instanceURL(
            a.options.push ? source: target
        );

        utils.catchAuthError(
            exports.replicate, replicator, [source, target, a.options],
            function (err, resp) {
                if (err) {
                    return logger.error(err);
                }
                logger.end();
            }
        );

    });
};


exports.init = function (settings, a, callback) {
    kansorc.extend(settings, '.kansorc', function (err, settings) {
        if (err) {
            return callback(err);
        }
        var source = utils.argToEnv(settings, a.positional[0]).db;
        var target = utils.argToEnv(settings, a.positional[1]).db;

        utils.completeAuth(source, false, function (err, source) {
            if (err) {
                return callback(err);
            }
            utils.completeAuth(source, false, function (err, source) {
                if (err) {
                    return callback(err);
                }
                callback(null, source, target, settings);
            });
        });
    });
};


exports.replicate = function (replicator, source, target, options, callback) {
    utils.completeAuth(replicator, false, function (err, replicator) {
        if (err) {
            return logger.error(err);
        }
        var data = {
            source: source,
            target: target
        };
        var db = couchdb(replicator);
        console.log('Replicating...');
        db.client('POST', '/_replicate', data, callback);
    });
};
