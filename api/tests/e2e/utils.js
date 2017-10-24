var _ = require('underscore'),
    PouchDB = require('pouchdb-core'),
    request = require('request-promise-native'),
    urlLib = require('url'),

    db,
    dbName;

PouchDB.plugin(require('pouchdb-adapter-http'));

//> INITIALISATION
{
  // check that API_URL is set
  if(!process.env.API_URL) {
    throw new Error('Please set API_URL in your env for medic-api e2e tests.');
  }

  // check that COUCH_URL is set
  if(!process.env.COUCH_URL) {
    throw new Error('Please set COUCH_URL in your env for medic-api e2e tests.');
  }

  // check that COUCH_URL doesn't look like the prod db (could be messy)
  if(process.env.COUCH_URL.endsWith('/medic') && process.env.CI !== 'true') {
    throw new Error('It looks like you\'re using your standard COUCH_URL for medic-api e2e tests.  You must use a temporary database!');
  }

  var couchUrl = urlLib.parse(process.env.COUCH_URL);

  if(couchUrl.pathname.length < 2) {
    throw new Error('No database name supplied in COUCH_URL env var.');
  }
  dbName = couchUrl.pathname.substring(1);
  var adminAuth = couchUrl.auth.split(':', 2);
  if(adminAuth.length !== 2) {
    throw new Error('Admin username and/or password not found in COUCH_URL env var.');
  }

  var adminUser = adminAuth[0];

  db = new PouchDB(process.env.COUCH_URL);
}
//> END INITIALISATION

module.exports = {
  adminUser: adminUser,

  API_URL: process.env.API_URL,
  COUCH_URL: process.env.COUCH_URL,

  adminDb: db,

  apiRequest: (endpoint, queryParams) => {
    var url = urlLib.parse(module.exports.API_URL);
    url.pathname = endpoint;
    url = urlLib.format(url);
    return request({
      uri: url,
      json: true,
      qs: queryParams
    });
  },

  cleanDb: function() {
    // delete all docs from DB except for standard medic docs
    return db.allDocs()
      .then(function(res) {
        return _.chain(res.rows)
            .reject(function(row) {
              var id = row.id;
              return id.indexOf('_design/') === 0 ||
                  id.indexOf('org.couchdb.user:') === 0 ||
                  ['appcache', 'messages', 'resources', 'PARENT_PLACE']
                      .indexOf(id) !== -1 ||
                  id.indexOf('messages-') === 0 ||
                  id.indexOf('fixture:') === 0;
            })
            .map(function(row) {
              return {
                _id: row.id,
                _rev: row.value.rev,
              };
            })
            .value();
      })
      .then(function(docs) {
        docs.forEach(function(doc) {
          doc._deleted = true;
        });
        return db.bulkDocs(docs);
      });
  },
};
