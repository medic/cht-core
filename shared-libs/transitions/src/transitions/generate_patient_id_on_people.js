const config = require('../config');
const transitionUtils = require('./utils');

module.exports = {
  filter: doc => {
    if (doc.patient_id) {
      // already has a patient id
      return;
    }
    const typeId = (doc.type === 'contact' && doc.contact_type) || doc.type;
    const contactTypes = config.get('contact_types') || [];
    const type = contactTypes.find(type => type.id === typeId);
    return type && type.person;
  },
  onMatch: change => {
    return transitionUtils
      .addUniqueId(change.doc)
      .then(() => true);
  },
  asynchronousOnly: true
};
