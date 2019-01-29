const request = require('request-promise-native');
const url = require('url');
const db = require('../db');
const environment = require('../environment');
const DB_ADMIN_ROLE = '_admin';

const updateUser = (admins, row) => {
  return db.medic.get(row.id)
    .then(userSettingsDoc => {
      userSettingsDoc.roles = row.doc.roles;
      if (admins[row.doc.name]) {
        userSettingsDoc.roles.push(DB_ADMIN_ROLE);
      }
      return db.medic.put(userSettingsDoc);
    })
    .catch(err => {
      if (err.status === 404) {
        // no user-settings doc to update
        return;
      }
      throw err;
    });
};

const getAdmins = function() {
  return request.get({
    url: url.format({
      protocol: environment.protocol,
      hostname: environment.host,
      port: environment.port,
      pathname: '_node/' + process.env.COUCH_NODE_NAME + '/_config/admins',
    }),
    auth: {
      user: environment.username,
      pass: environment.password
    },
    json: true
  });
};

module.exports = {
  name: 'extract-user-settings-roles',
  created: new Date(2016, 4, 26, 15, 10, 0, 0),
  run: () => {
    return getAdmins().then(admins => {
      return db.users.allDocs({ include_docs: true }).then(result => {
        const userRows = result.rows.filter(row => row.id.indexOf('org.couchdb.user:') === 0);
        return Promise.all(userRows.map(row => updateUser(admins, row)));
      });
    });
  }
};
