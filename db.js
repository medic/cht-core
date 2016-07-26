var nano = require('nano'),
	url = require('url'),
    path = require('path');

var couchUrl = process.env.COUCH_URL;
if (couchUrl) {
    // strip trailing slash from to prevent bugs in path matching
    couchUrl = couchUrl.replace(/\/$/, '');
    var parsedUrl = url.parse(couchUrl);

    module.exports = nano(couchUrl.substring(0, couchUrl.indexOf('/', 10)));
    module.exports.medic = nano(couchUrl);

    var dbName = parsedUrl.path.replace('/','');
    module.exports.settings = {
        protocol: parsedUrl.protocol,
        port: parsedUrl.port,
        host: parsedUrl.hostname,
        db: dbName,
        auditDb: dbName + '-audit',
        ddoc: 'medic'
    };

    if (parsedUrl.auth) {
        var index = parsedUrl.auth.indexOf(':');
        module.exports.settings.username = parsedUrl.auth.substring(0, index);
        module.exports.settings.password = parsedUrl.auth.substring(index + 1);
    }

    module.exports.fti = function(index, data, cb) {
        var uri = path.join('/_fti/local', module.exports.settings.db, '_design', module.exports.settings.ddoc, index);
        module.exports.request({ path: uri, qs: data }, cb);
    };
    module.exports.config = function(cb) {
        module.exports.request({ path: '/_config' }, cb);
    };
} else if (process.env.TEST_ENV) {
    // Running tests only
    module.exports = {
        fti: function() {},
        medic: {
            view: function() {},
            get: function() {},
            insert: function() {}
        },
        settings: {}
    };
} else {
    console.log(
        'Please define a COUCH_URL in your environment e.g. \n' +
        'export COUCH_URL="http://admin:123qwe@localhost:5984/medic"\n' +
        'If you are running tests use TEST_ENV=1 in your environment.\n'
    );
    process.exit(1);
}
