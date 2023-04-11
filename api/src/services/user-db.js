/**
 * @module user-db
 */
const request = require('request-promise-native');
const url = require('url');
const db = require('../db');
const environment = require('../environment');

// Regex to test for characters that are invalid in db names
// Only lowercase characters (a-z), digits (0-9), and any of the characters _, $, (, ), +, -, and / are allowed.
// https://wiki.apache.org/couchdb/HTTP_database_API#Naming_and_Addressing
const DB_NAME_BLOCKED_CHARS = /[^a-z0-9_$()+/-]/g;

// Space added after function to make Function.toString() output consistent
// across node versions: https://github.com/nodejs/node/issues/20355
// We are currently testing the exact content of the map function in tests/unit/lib/user-db.js
/* eslint-disable no-var */
const readMapFunction = function (doc) {
  var parts = doc._id.split(':');
  if (parts[0] === 'read') {
    emit(parts[1]);
  }
};
/* eslint-enable no-var */

const validateDocUpdate = function (newDoc) {
  if (newDoc && newDoc._deleted && newDoc.purged) {
    throw({forbidden: 'Purged documents should not be written to CouchDB!'});
  }
};

const ddoc = {
  _id: '_design/medic-user',
  views: {
    read: {
      map: readMapFunction.toString(),
      reduce: '_count'
    }
  },
  validate_doc_update: validateDocUpdate.toString(),
};

// Replaces characters that are invalid in a couchdb database name
// with parens around the UTF-16 code number, eg: "." becomes "(46)"
const escapeUsername = name => name.replace(DB_NAME_BLOCKED_CHARS, match => {
  return `(${match.charCodeAt(0)})`;
});

const dbNameRegexp = new RegExp(`^${environment.db}-user-.+-meta$`);

module.exports = {
  /**
   * @param {String} username
   * @returns {String} The name of the user db
   */
  getDbName: username => `${environment.db}-user-${escapeUsername(username)}-meta`,

  /**
   * @param {String} dbName
   * @returns {boolean} Whether is it a meta db name or not
   */
  isDbName: (dbName) => dbNameRegexp.test(dbName),

  /**
   * @param {String} dbName
   * @param {String} username
   * @returns {Promise} The put request
   */
  setSecurity: (dbName, username) => {
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
  },

  /**
   * @param {String} username
   * @returns {Promise} The request to create the db.
   */
  create: username => {
    const dbName = module.exports.getDbName(username);
    let database;
    return db
      .exists(dbName)
      .then(result => {
        if (result) {
          database = result;
          return;
        }

        database = db.get(dbName);
        return database.put(ddoc).then(() => module.exports.setSecurity(dbName, username));
      })
      .then(result => {
        db.close(database);
        return result;
      })
      .catch(err => {
        db.close(database);
        throw err;
      });
  },

  validateDocUpdate,
};
