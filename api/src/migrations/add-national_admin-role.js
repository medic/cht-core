const _ = require('underscore'),
  request = require('request'),
  url = require('url'),
  series = require('async/series'),
  { promisify } = require('util'),
  db = require('../db-pouch'),
  logger = require('../logger');

const DEFAULT_STRUCTURE = {
  names: [],
  roles: [],
};

const addRole = (dbname, role, callback) => {
  request.get({
    url: url.format({
      protocol: db.settings.protocol,
      hostname: db.settings.host,
      port: db.settings.port,
      pathname: `${dbname}/_security`,
    }),
    auth: {
      user: db.settings.username,
      pass: db.settings.password
    },
    json: true
  }, (err, result) => {
    if (err) {
      return callback(err);
    }

    // In CouchDB 1.x, if you have not written to the _security object before
    // it is empty.
    if (!result.admins) {
      result.admins = DEFAULT_STRUCTURE;
    }

    if (!result.admins.roles.includes(role)) {
      logger.info(`Adding ${role} role to ${dbname} admins`);
      result.admins.roles.push(role);
    }

    request.put({
      url: url.format({
        protocol: db.settings.protocol,
        hostname: db.settings.host,
        port: db.settings.port,
        pathname: `${dbname}/_security`,
      }),
      auth: {
        user: db.settings.username,
        pass: db.settings.password
      },
      json: true,
      body: result
    }, callback);
  });
};

module.exports = {
  name: 'add-national_admin-role',
  created: new Date(2017, 3, 30),
  run: promisify(callback => {
    series(
      [
        _.partial(addRole, '_users', 'national_admin'),
        _.partial(addRole, db.settings.db, 'national_admin'),
      ],
      callback
    );
  }),
};
