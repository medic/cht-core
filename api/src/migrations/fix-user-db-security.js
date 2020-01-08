const db = require('../db');
const {promisify} = require('util');
const userDb = require('../services/user-db');

module.exports = {
  name: 'fix-user-db-security',
  created: new Date(2018, 4, 12),
  run: promisify(callback => {
    db.users.allDocs()
      .then(docs => {
        const usernames = docs.rows
          .map(row => row.id)
          .filter(id => id.indexOf('org.couchdb.user:') === 0)
          .map(id => id.split(':')[1]);

        return usernames.reduce((p, username) => {
          return p.then(() => {
            return userDb.setSecurity(userDb.getDbName(username), username)
              .catch(err => {
                if (err.statusCode !== 404) {
                  throw err;
                }
                // db not found is ok
              });
          });
        }, Promise.resolve());
      })
      .then(() => callback())
      .catch(callback);
  })
};
