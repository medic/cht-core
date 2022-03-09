const environment = require('../../src/environment');
const db = require('../../src/db');

module.exports.run = async () => {
  await environment.initialize(process.env.COUCH_URL);
  db.initialize();
};
