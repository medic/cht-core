const config = require('./libs/config');
const db = require('./libs/db');
const dataContext = require('./libs/data-context');
const lineage = require('./libs/lineage');
const people = require('./people');
const places = require('./places');

module.exports = (sourceConfig, sourceDb, sourceDataContext) => {
  config.init(sourceConfig);
  db.init(sourceDb);
  dataContext.init(sourceDataContext);
  lineage.init(require('@medic/lineage')(Promise, db.medic));

  return {
    people,
    places,
  };
};

