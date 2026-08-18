const request = require('@medic/couch-request');
const url = require('node:url');
const environment = require('@medic/environment');
const { USER_ROLES } = require('@medic/constants');

// The delete database holds full copies of deleted documents, so it is locked to database admins the
// same way the vault is. Without this it is created with an empty security object, which leaves it
// readable and writable by any authenticated user through the api's CouchDB proxy.
const addSecurityToDb = () => {
  const dbAdminRole = USER_ROLES.COUCHDB_ADMIN;
  const securityObject = {
    admins: { names: [], roles: [ dbAdminRole ] },
    members: { names: [], roles: [ dbAdminRole ] }
  };
  return request.put({
    url: url.format({
      protocol: environment.protocol,
      hostname: environment.host,
      port: environment.port,
      pathname: `${environment.db}-delete/_security`,
    }),
    auth: {
      username: environment.username,
      password: environment.password
    },
    json: true,
    body: securityObject
  });
};

module.exports = {
  name: 'restrict-access-to-delete-db',
  created: new Date(2026, 7, 18),
  run: async () => {
    try {
      await addSecurityToDb();
    } catch (err) {
      throw new Error(`Failed to restrict access to the delete db. ${JSON.stringify(err, null, 2)}`);
    }
  }
};
