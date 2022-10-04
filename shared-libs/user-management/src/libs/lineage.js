const Lineage = require('@medic/lineage');
const db = require('./db');

let lineage;

module.exports = {
  get: () => {
    if (!lineage) {
      lineage = Lineage(Promise, db.medic);
    }
    return lineage;
  },
};
