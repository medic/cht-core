const request = require('request-promise-native');
const url = require('url');
const environment = require('../environment');
const logger = require('../logger');

const DEFAULT_STRUCTURE = {
  names: [],
  roles: [],
};

const addRole = (dbname, role) => {
  return request.get({
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
  })
    .then(body => {
      // In CouchDB 1.x, if you have not written to the _security object before
      // it is empty.
      if (!body.admins) {
        body.admins = DEFAULT_STRUCTURE;
      }

      if (!body.admins.roles.includes(role)) {
        logger.info(`Adding ${role} role to ${dbname} admins`);
        body.admins.roles.push(role);
      }
      return request.put({
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
      });
    });
};

module.exports = {
  name: 'add-national_admin-role',
  created: new Date(2017, 3, 30),
  run: () => {
    return Promise.resolve()
      .then(() => addRole('_users', 'national_admin'))
      .then(() => addRole(environment.db, 'national_admin'));
  }
};
