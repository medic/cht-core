var nano = require('nano'),
    _ = require('underscore'),
	url = require('url'),
    path = require('path'),
    logger = require('./lib/logger'),
    settings = {};

if (process.env.COUCH_URL) {
    var couchUrl = url.parse(process.env.COUCH_URL);

    _.extend(settings, {
        protocol: couchUrl.protocol,
        port: couchUrl.port,
        host: couchUrl.hostname,
        db: couchUrl.path.replace('/',''),
        ddoc: 'medic'
    });

    if (couchUrl.auth) {
        var index = couchUrl.auth.indexOf(':');

        _.extend(settings, {
            username: couchUrl.auth.substring(0, index),
            password: couchUrl.auth.substring(index + 1)
        });
    }
} else if (!process.env.TEST_ENV) {
    console.log(
        "Please define a COUCH_URL in your environment e.g. \n" +
        "export COUCH_URL='http://admin:123qwe@localhost:5984/medic'\n" +
        "If you are running tests use TEST_ENV=1 in your environment.\n"
    );
    process.exit(1);
}

module.exports = nano(process.env.COUCH_URL.substring(0, process.env.COUCH_URL.indexOf('/', 10)));
module.exports.medic = nano(process.env.COUCH_URL);
module.exports.settings = settings;
module.exports.fti = function(index, data, cb) {
    var uri = path.join('/_fti/local', settings.db, '_design', settings.ddoc, index);
    module.exports.request({ path: uri, qs: data }, cb);
};
module.exports.config = function(cb) {
    module.exports.request({ path: '/_config' }, cb);
};
