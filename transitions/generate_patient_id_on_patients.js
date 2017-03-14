var transitionUtils = require('./utils');

module.exports = {
  filter: function(doc) {
    return doc.type === 'person' &&
           !doc.patient_id;
  },
  onMatch: function(change, db, audit, callback) {
    transitionUtils.addUniqueId(db, change.doc, callback);
  }
};
