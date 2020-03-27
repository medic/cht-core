const db = require('../db').medic;
const lineage = require('@medic/lineage')(Promise, db);

module.exports = doc => {
  if ((doc.contact && doc.contact.type) || (doc.parent && doc.parent.type)) {
    lineage.minify(doc);
    return true;
  }
  return false;
};
