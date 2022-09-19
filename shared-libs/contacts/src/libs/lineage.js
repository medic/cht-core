const Lineage = require('@medic/lineage');
const db = require('./db');

module.exports = {
  get: () => Lineage(Promise, db.medic),
};
