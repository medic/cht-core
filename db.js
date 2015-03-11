var path = require('path'),
    url = require('url'),
    _ = require('underscore'),
    couchdb = require('felix-couchdb'),
    settings = {};

if (process.env.COUCH_URL) {
    var couch_url = url.parse(process.env.COUCH_URL);

    _.extend(settings, {
        port: couch_url.port,
        host: couch_url.hostname,
        db: couch_url.path,
        ddoc: 'medic'
    });

    if (couch_url.auth) {
        var index = couch_url.auth.indexOf(':');

        _.extend(settings, {
            username: couch_url.auth.substring(0, index),
            password: couch_url.auth.substring(index + 1)
        });
    }
} else if (!process.env.TEST_ENV) {
    console.log(
        "Please define a COUCH_URL in your environment e.g. \n" +
        "export COUCH_URL='http://admin:123qwe@localhost:5984/medic'\n\n" +
        "If you are running tests use TEST_ENV=1 in your environment.\n"
    );
    process.exit(1);
}

var client = couchdb.createClient(
    settings.port,
    settings.host,
    settings.username,
    settings.password
);
module.exports = client.db(settings.db);
module.exports.user = settings.username;
module.exports.fti = function(index, data, cb) {
    var url = path.join('/_fti/local', settings.db, '_design', settings.ddoc, index);
    if (data.q && !data.limit) {
        data.limit = 1000;
    }
    client.request({
        method: data.q ? 'post' : 'get',
        path: url,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: couchdb.toQuery(data)
    }, function(err, result) {
        if (err) {
            // the request itself failed
            return cb(err);
        }
        if (data.q && !result.rows) {
            // the query failed for some reason
            return cb(result);
        }
        cb(null, result);
    });
};
module.exports.getView = function(view, query, callback) {
    module.exports.view(settings.ddoc, view, query, callback);
};
module.exports.getSettings = function(cb) {
    var path = settings.db + '/_design/' + settings.ddoc + '/_rewrite/app_settings/' + settings.ddoc;
    client.request({ path: path }, cb);
};
module.exports.getPath = function() {
    return settings.db + '/_design/' + settings.ddoc + '/_rewrite';
};