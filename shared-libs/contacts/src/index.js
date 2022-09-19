const config = require('./libs/config');
const db = require('./libs/db');
const people = require('./people');
const places = require('./places');

module.exports = (sourceConfig, sourceDb) => {
  config.init(sourceConfig);
  db.init(sourceDb);
  return {
    people,
    places,
  };
};

