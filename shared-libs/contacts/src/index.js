const config = require('./libs/config');
const db = require('./libs/db');
const lineage = require('./libs/lineage');
const people = require('./people');
const places = require('./places');

module.exports = (sourceConfig, sourceDb) => {
  config.init(sourceConfig);
  db.init(sourceDb);
  lineage.init(require('@medic/lineage')(Promise, db.medic));

  return {
    people,
    places,
  };
};

