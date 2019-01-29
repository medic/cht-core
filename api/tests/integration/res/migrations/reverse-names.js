const db = require('../../../../src/db');

module.exports = {
  name: 'extract-person-contacts',
  created: new Date(),
  run: () => {
    return db.medic.allDocs({ include_docs: true }).then(body => {
      return Promise.all(body.rows.map(row => {
        const doc = row.doc;
        if (doc._id.indexOf('_design/') === 0) {
          return;
        }
        doc.name = doc.name.split('').reverse().join('');
        return db.medic.put(doc);
      }));
    });
  }
};
