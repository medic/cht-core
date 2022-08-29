const request = require('request-promise-native');
const url = require('url');
const environment = require('../environment');

const addSecurityToDb = () => {
  const dbAdminRole = '_admin';
  const securityObject = {
    admins: { names: [], roles: [ dbAdminRole ] },
    members: { names: [], roles: [ dbAdminRole ] }
  };
  return request.put({
    url: url.format({
      protocol: environment.protocol,
      hostname: environment.host,
      port: environment.port,
      pathname: `${environment.db}-vault/_security`,
    }),
    auth: {
      user: environment.username,
      pass: environment.password
    },
    json: true,
    body: securityObject
  });
};

module.exports = {
  name: 'restrict-access-to-vault-db',
  created: new Date(2022, 4, 4),
  run: () => {
    return addSecurityToDb()
      .catch(err => {
        return Promise.reject(new Error('Failed to add security to vault db.' +
          JSON.stringify(err, null, 2)));
      });
  }
};
