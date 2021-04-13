const formsList = require('../lib/forms-list');
const pouch = require('../lib/db');

module.exports = {
  requiresInstance: true,
  execute: () => {
    const db = pouch();
    return formsList(db, { include_docs: true })
      .then(res => res.rows)
      .then(forms => Promise.all(forms.map(f => db.remove(f.doc))));
  }
};
