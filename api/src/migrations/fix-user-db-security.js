const db = require('../db-pouch'),
      {promisify} = require('util'),
      userDb = require('../services/user-db');

module.exports = {
  name: 'fix-user-db-security',
  created: new Date(2018, 4, 12),
  run: promisify(callback => {
    db.users.allDocs()
      .then(docs => {
        return Promise.all(docs.rows
          .map(row => row.id)
          .filter(id => id.indexOf('org.couchdb.user:') === 0)
          .map(id => id.split(':')[1])
          .map(username => {
            return new Promise((resolve, reject) => {
              userDb.setSecurity(userDb.getDbName(username), username, err => {
                if (err && err.statusCode !== 404) { // db not found is ok
                  return reject(err);
                }
                resolve();
              });
            });
          }));
      })
      .then(() => callback())
      .catch(callback);
  })
};
