const config = require('./libs/config');
const db = require('./libs/db');

module.exports = (sourceConfig, sourceDb) => {
  config.init(sourceConfig);
  db.init(sourceDb);

  // Load these modules after the config and db are initialized
  const people = require('./people');
  const places = require('./places');
  return {
    people,
    places,
  };
};

