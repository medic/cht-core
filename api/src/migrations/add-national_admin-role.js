const _ = require('underscore'),
  request = require('request'),
  url = require('url'),
  series = require('async/series'),
  { promisify } = require('util'),
  environment = require('../environment'),
  logger = require('../logger');

const DEFAULT_STRUCTURE = {
  names: [],
  roles: [],
};

const addRole = (dbname, role, callback) => {
  request.get({
    url: url.format({
      protocol: environment.protocol,
      hostname: environment.host,
      port: environment.port,
      pathname: `${dbname}/_security`,
    }),
    auth: {
      user: environment.username,
      pass: environment.password
    },
    json: true
  }, (err, response, body) => {
    if (err) {
      return callback(err);
    }

    // In CouchDB 1.x, if you have not written to the _security object before
    // it is empty.
    if (!body.admins) {
      body.admins = DEFAULT_STRUCTURE;
    }

    if (!body.admins.roles.includes(role)) {
      logger.info(`Adding ${role} role to ${dbname} admins`);
      body.admins.roles.push(role);
    }

    request.put({
      url: url.format({
        protocol: environment.protocol,
        hostname: environment.host,
        port: environment.port,
        pathname: `${dbname}/_security`,
      }),
      auth: {
        user: environment.username,
        pass: environment.password
      },
      json: true,
      body: body
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
        _.partial(addRole, environment.db, 'national_admin'),
      ],
      callback
    );
  }),
};
