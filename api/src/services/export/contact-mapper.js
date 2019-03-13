const db = require('../../db'),
      search = require('@medic/search')(Promise, db.medic);

module.exports = {
  db: db.medic,
  getDocIds: (options, filters) => {
    return search('contacts', filters, options).then(results => results.docIds);
  },
  map: () => Promise.resolve({
    header: ['id', 'rev', 'name', 'patient_id', 'type'],
    getRows: record => [[record._id, record._rev, record.name, record.patient_id, record.type]]
  })
};
