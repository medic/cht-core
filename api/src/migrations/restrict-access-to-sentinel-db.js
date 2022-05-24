const request = require('request-promise-native');
const url = require('url');
const environment = require('../environment');

const addSecurityToDb = () => {
  const sentinelRole = 'sentinel';
  const securityObject = {
    admins: { names: [], roles: [ sentinelRole ] },
    members: { names: [], roles: [ sentinelRole ] }
  };
  return request.put({
    url: url.format({
      protocol: environment.protocol,
      hostname: environment.host,
      port: environment.port,
      pathname: `${environment.db}-sentinel/_security`,
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
  name: 'restrict-access-to-sentinel-db',
  created: new Date(2020, 5, 29),
  run: () => {
    return addSecurityToDb()
      .catch(err => {
        return Promise.reject(new Error('Failed to add security to sentinel db.' +
          JSON.stringify(err, null, 2)));
      });
  }
};
