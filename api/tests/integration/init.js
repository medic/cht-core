const environment = require('../../src/environment');
const db = require('../../src/db');

module.exports.run = async () => {
  await environment.initialize();
  db.initialize();
};
