var couchdb = require('felix-couchdb'),
    _ = require('underscore'),
	url = require('url');

var logger = require('./lib/logger'),
    settings = {};

if (process.env.COUCH_URL) {
	var couch_url = url.parse(process.env.COUCH_URL);

    _.extend(settings, {
		port: couch_url.port,
		host: couch_url.hostname,
		db: couch_url.path
	});

	if (couch_url.auth) {
		var index = couch_url.auth.indexOf(':');

        _.extend(settings, {
            username: couch_url.auth.substring(0, index),
            password: couch_url.auth.substring(index + 1)
        });
	}
} else if (!process.env.TEST_ENV) {
    logger.error(
        "Please define a COUCH_URL in your environment e.g. \n" +
        "export COUCH_URL='http://admin:123qwe@localhost:5984/medic'\n" +
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
    var path = '/_fti/local' + settings.db 
        + '/_design' + settings.db + '/' + index;
    logger.debug('fti path: ', path);
    logger.debug('fti query: ', data);
    client.request({
        path: path,
        query: data
    }, cb);
};
