const db = require('../db');

module.exports = {
  name: 'drop-couchmark-db',
  created: new Date(2000, 1, 1), // really early so it runs first
  run: () => {
    return db.get('couchmark').destroy().catch(err => {
      if (err.status === 404) {
        // couchmark db not found - all good
        return;
      }
      throw err;
    });
  }
};
