var utils = require('../utils'),
    logger = require('../logger'),
    couchdb = require('../couchdb'),
    kansorc = require('../kansorc'),
    argParse = require('../args').parse,
    async = require('async'),
    path = require('path'),
    url = require('url'),
    urlParse = url.parse,
    urlFormat = url.format,
    _ = require('underscore')._;


exports.summary = 'List databases on a CouchDB instance';

exports.usage = '' +
'kanso listdb [URL]\n' +
'\n' +
'Where URL is either a URL for the desired Couch instance or\n' +
'blank for localhost:5984:\n' +
'\n' +
'kanso createdb\n' +
'kanso createdb http://hostname:port\n' +
'kanso createdb http://username@hostname:port\n' +
'kanso createdb http://username:password@hostname:port\n' +
'\n' +
'Parameters:\n' +
'  URL    The URL of the CouchDB instance to list databases from\n' +
'\n' +
'Options:\n' +
'  -l    Show extra details for each database: doc count and size on disk';




exports.run = function (settings, args, commands) {
    var a = argParse(args, {
        'details': {match: ['-l']}
    });
    var couchdb_url = a.positional[0] || 'http://localhost:5984';

    // /_all_dbs is at the root couchdb instance level, not the db level
    var parsed = url.parse(couchdb_url);
    delete parsed.pathname;
    delete parsed.query;
    delete parsed.search;
    var db = couchdb(url.format(parsed));

    utils.catchAuthError(
        exports.listdb, couchdb_url, [], function (err, list, url) {
            if (err) {
                return logger.error(err);
            }
            exports.listInfo(url, list, a.options.details, function (err) {
                if (err) {
                    return logger.error(err);
                }
                logger.clean_exit = true;
            });
        }
    );
};


exports.listdb = function (url, callback) {
    utils.completeAuth(url, false, function (err, url) {
        if (err) {
            return callback(err);
        }
        var db = couchdb(url);
        db.allDbs(function (err, list) {
            callback(err, list, url);
        });
    });
};


exports.listInfo = function (url, list, show_details, callback) {
    var db = couchdb(url);
    var colwidth = _.max(list.map(function (l) {
        return l.length;
    }));
    async.forEachSeries(list, function (l, cb) {
        if (show_details) {
            db.client('GET', l, {}, function (err, info) {
                if (err) {
                    if (err.error === 'unauthorized') {
                        console.log(l);
                        return cb();
                    }
                    return cb(err);
                }
                console.log(
                    utils.padRight(l, colwidth + 4) +
                    utils.padRight(info.doc_count + ' docs', 16) +
                    utils.formatSize(info.disk_size)
                );
                cb();
            });
        }
        else {
            console.log(l);
            process.nextTick(cb);
        }
    }, callback);
};
