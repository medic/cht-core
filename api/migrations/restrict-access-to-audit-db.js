const db = require('../db');

const addMemberToDb = (callback) => {
  const securityObject = {
    admins: { names:[], roles: ['audit-writer'] },
    members: { names: [], roles:['audit-writer'] }
  };
  db.request(
    {
      db: db.settings.auditDb,
      path: '/_security',
      method: 'put',
      body: securityObject
    },
    callback);
};

module.exports = {
  name: 'restrict-access-to-audit-db',
  created: new Date(2017, 5, 8),
  run: callback => {
    addMemberToDb((err) => {
      if (err) {
        return callback(new Error('Failed to add member to audit db.' +
          JSON.stringify(err, null, 2)));
      }
      callback();
    });
  }
};
