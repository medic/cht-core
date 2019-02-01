const request = require('request-promise-native');
const url = require('url');
const db = require('../db');
const environment = require('../environment');

// Regex to test for characters that are invalid in db names
// Only lowercase characters (a-z), digits (0-9), and any of the characters _, $, (, ), +, -, and / are allowed.
// https://wiki.apache.org/couchdb/HTTP_database_API#Naming_and_Addressing
const DB_NAME_BLACKLIST = /[^a-z0-9_$()+/-]/g;

// Space added after function to make Function.toString() output consistent
// across node versions: https://github.com/nodejs/node/issues/20355
// We are currently testing the exact content of the map function in tests/unit/lib/user-db.js
const readMapFunction = function (doc) {
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

const setSecurity = (dbName, username) => {
  return request.put({
    url: url.format({
      protocol: environment.protocol,
      hostname: environment.host,
      port: environment.port,
      pathname: `${dbName}/_security`,
    }),
    auth: {
      user: environment.username,
      pass: environment.password
    },
    json: true,
    body: {
      admins: { names: [ username ], roles: [] },
      members: { names: [ username ], roles: [] }
    }
  });
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
  setSecurity: setSecurity,
  create: username => {
    const dbName = module.exports.getDbName(username);
    return db.exists(dbName).then(found => {
      if (!found) {
        const database = db.get(dbName);
        return database.put(ddoc)
          .then(() => {
            return setSecurity(dbName, username);
          });
      }
    });
  }
};
