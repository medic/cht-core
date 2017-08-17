const db = require('../db'),
      async = require('async');

// Regex to test for characters that are invalid in db names
// Only lowercase characters (a-z), digits (0-9), and any of the characters _, $, (, ), +, -, and / are allowed.
// https://wiki.apache.org/couchdb/HTTP_database_API#Naming_and_Addressing
const DB_NAME_BLACKLIST = /[^a-z0-9_$()+/-]/g;

const readMapFunction = function(doc) {
  var parts = doc._id.split(':');
  if (parts[0] === 'read') {
    emit(parts[1]);
  }
};

const ddoc = {
  _id: '_design/medic-user',
  views: {
    read: {
      map: readMapFunction.toString(),
      reduce: '_count'
    }
  }
};

const createDb = (dbName, callback) => {
  db.db.create(dbName, callback);
};

const setSecurity = (dbName, username, callback) => {
  db.request({
    db: dbName,
    path: '/_security',
    method: 'PUT',
    body: {
      admins: { names: [ username ], roles: [] },
      members: { names: [], roles:[] }
    }
  }, callback);
};

const putDdoc = (dbName, callback) => {
  db.use(dbName).insert(ddoc, callback);
};

/**
 * Replaces characters that are invalid in a couchdb database name
 * with parens around the UTF-16 code number, eg: "." becomes "(46)"
 */
const escapeUsername = name => name.replace(DB_NAME_BLACKLIST, match => {
  return `(${match.charCodeAt(0)})`;
});

module.exports = {
  getDbName: username => `medic-user-${escapeUsername(username)}-meta`,
  create: (username, callback) => {
    const dbName = module.exports.getDbName(username);
    async.series([
      async.apply(createDb, dbName),
      async.apply(setSecurity, dbName, username),
      async.apply(putDdoc, dbName)
    ], callback);
  }
};
