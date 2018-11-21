const request = require('request'),
      url = require('url'),
      {promisify} = require('util'),
      environment = require('../environment');

const addMemberToDb = (callback) => {
  const securityObject = {
    admins: { names:[], roles: ['audit-writer'] },
    members: { names: [], roles:['audit-writer'] }
  };
  request.put({
    url: url.format({
      protocol: environment.protocol,
      hostname: environment.host,
      port: environment.port,
      pathname: `${environment.db}-audit/_security`,
    }),
    auth: {
      user: environment.username,
      pass: environment.password
    },
    json: true,
    body: securityObject
  }, callback);
};

module.exports = {
  name: 'restrict-access-to-audit-db',
  created: new Date(2017, 5, 8),
  run: promisify(callback => {
    addMemberToDb((err) => {
      if (err) {
        return callback(new Error('Failed to add member to audit db.' +
          JSON.stringify(err, null, 2)));
      }
      callback();
    });
  })
};
