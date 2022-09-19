const db = require('../db');
const search = require('@medic/search');

module.exports = {
  execute: (type, filters, options, extensions) => search(Promise, db.medic)(type, filters, options, extensions),
};
