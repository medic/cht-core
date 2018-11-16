const db = require('../../db-pouch'),
      search = require('@shared-libs/search')(Promise, db.medic);

module.exports = {
  getDocIds: (options, filters) => search('contacts', filters, options),
  map: () => Promise.resolve({
    header: ['id', 'rev', 'name', 'patient_id', 'type'],
    getRows: record => [[record._id, record._rev, record.name, record.patient_id, record.type]]
  })
};
