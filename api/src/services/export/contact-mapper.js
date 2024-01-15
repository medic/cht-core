const db = require('../../db');
const search = require('@medic/search')(Promise, db.medic);
const lineage = require('@medic/lineage')(Promise, db.medic);

module.exports = {
  getDocs: ids => lineage.fetchHydratedDocs(ids),
  getDocIds: (options, filters) => {
    return search('contacts', filters, options).then(results => results.docIds);
  },
  map: () => Promise.resolve({
    header: ['id', 'rev', 'name', 'patient_id', 'type', 'contact_type', 'place_id'],
    getRows: record => [[
      record._id,
      record._rev,
      record.name,
      record.patient_id,
      record.type,
      record.contact_type,
      record.place_id,
    ]]
  })
};
