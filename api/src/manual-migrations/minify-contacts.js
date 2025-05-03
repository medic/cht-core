const db = require('../db').medic;
const datasource = require('@medic/cht-datasource');
const lineage = require('@medic/lineage')(Promise, db, datasource);

module.exports = doc => {
  if ((doc.contact && doc.contact.type) || (doc.parent && doc.parent.type)) {
    lineage.minify(doc);
    return true;
  }
  return false;
};
