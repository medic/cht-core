var couchdb = require('felix-couchdb'),
	url = require('url'),
    settings;

if (process.env.COUCH_URL) {
	var couch_url = url.parse(process.env.COUCH_URL);
	settings = {
		port: couch_url.port,
		host: couch_url.hostname,
		db : couch_url.path
	};
	if (couch_url.auth) {
		var unamepass = couch_url.auth.split(':');
		settings.username = unamepass[0];
		settings.password = unamepass[1];
	}
} else if (process.env.SENTINEL_TEST) {
    settings = require('./settings-test');
} else {
    settings = require('./settings');
}
var client = couchdb.createClient(
    settings.port,
    settings.host,
    settings.username,
    settings.password
);
module.exports = client.db(settings.db);
