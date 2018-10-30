const _ = require('underscore'),
  { promisify } = require('util'),
  db = require('../db-nano'),
  logger = require('../logger'),
  series = require('async/series');

const DEFAULT_STRUCTURE = {
  names: [],
  roles: [],
};

const addRole = (dbname, role, callback) =>
  db.request(
    {
      db: dbname,
      method: 'GET',
      path: '_security',
    },
    (err, result) => {
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

      db.request(
        {
          db: dbname,
          method: 'PUT',
          path: '_security',
          body: result,
        },
        callback
      );
    }
  );

module.exports = {
  name: 'add-national_admin-role',
  created: new Date(2017, 3, 30),
  run: promisify(callback =>
    series(
      [
        _.partial(addRole, '_users', 'national_admin'),
        _.partial(addRole, db.settings.db, 'national_admin'),
      ],
      callback
    )
  ),
};
