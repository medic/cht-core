const db = require('../../db');
const search = require('@medic/search')(Promise, db.medic);
const lineage = require('@medic/lineage')(Promise, db.medic);

module.exports = {
  getDocs: ids => {
    return db.medic.allDocs({ keys: ids, include_docs: true })
      .then(result => result.rows.map(row => row.doc))
      .then(lineage.hydrateDocs);
  },
  getDocIds: (options, filters) => {
    return search('contacts', filters, options).then(results => results.docIds);
  },
  map: () => Promise.resolve({
    header: ['id', 'rev', 'name', 'patient_id', 'type'],
    getRows: record => [[record._id, record._rev, record.name, record.patient_id, record.type]]
  })
};
