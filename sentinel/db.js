var couchdb = require('felix-couchdb'),
    settings;

if (process.env.SENTINEL_TEST) {
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
