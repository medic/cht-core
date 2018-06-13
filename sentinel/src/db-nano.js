/*************************************************
 *          !!! DEPRECATION WARNING !!!          *
 * Please use db-pouch in preference to db-nano! *
 *          !!! DEPRECATION WARNING !!!          *
 *************************************************/

var nano = require('nano'),
	url = require('url');

var couchUrl = process.env.COUCH_URL;
if (couchUrl) {
    // strip trailing slash from to prevent bugs in path matching
    couchUrl = couchUrl.replace(/\/$/, '');
    var parsedUrl = url.parse(couchUrl);
    var dbName = parsedUrl.path.replace('/','');
    var auditName = dbName + '-audit';
    var ddocName = 'medic';
    module.exports = nano(couchUrl.substring(0, couchUrl.indexOf('/', 10)));
    module.exports.settings = {
        protocol: parsedUrl.protocol,
        port: parsedUrl.port,
        host: parsedUrl.hostname,
        db: dbName,
        ddoc: ddocName
    };
    if (parsedUrl.auth) {
        var index = parsedUrl.auth.indexOf(':');
        module.exports.settings.username = parsedUrl.auth.substring(0, index);
        module.exports.settings.password = parsedUrl.auth.substring(index + 1);
    }
    module.exports.medic = nano(couchUrl);
    module.exports.audit = require('couchdb-audit')
        .withNano(module.exports, dbName, auditName, ddocName, module.exports.settings.username);
} else if (process.env.UNIT_TEST_ENV) {
    // Running tests only
    module.exports = {
        use: function() {},
        audit: {
            get: function() {},
            saveDoc: function() {},
            bulkSave: function() {}
        },
        medic: {
            view: function() {},
            get: function() {},
            insert: function() {},
            fetch: function() {}
        },
        db: {
            list: function() {}
        },
        settings: {}
    };
} else {
    console.log(
        'Please define a COUCH_URL in your environment e.g. \n' +
        'export COUCH_URL="http://admin:123qwe@localhost:5984/medic"\n' +
        'If you are running tests use UNIT_TEST_ENV=1 in your environment.\n'
    );
    process.exit(1);
}
