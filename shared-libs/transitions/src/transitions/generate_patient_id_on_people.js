const config = require('../config');
const transitionUtils = require('./utils');

module.exports = {
  filter: doc => {
    if (doc.patient_id) {
      // already has a patient id
      return;
    }
    const typeId = doc.contact_type || doc.type;
    const contactTypes = config.get('contact_types') || [];
    const type = contactTypes.find(type => type.id === typeId);
    return type && type.person;
  },
  onMatch: change => {
    return new Promise((resolve, reject) => {
      transitionUtils.addUniqueId(change.doc, err => {
        if (err) {
          return reject(err);
        }
        resolve(true);
      });
    });
  },
  asynchronousOnly: true
};
