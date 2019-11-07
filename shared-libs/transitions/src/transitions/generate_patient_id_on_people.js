const config = require('../config');
const transitionUtils = require('./utils');
const contactTypeUtils = require('@medic/contact-types-utils');

module.exports = {
  filter: doc => {
    const contactType = contactTypeUtils.getContactType(config.getAll(), doc);
    if (!contactType) {
      return;
    }

    if (contactTypeUtils.isPersonType(contactType) && doc.patient_id) {
      return;
    }

    if (contactTypeUtils.isPlaceType(contactType) && doc.place_id) {
      return;
    }

    return true;
  },
  onMatch: change => {
    const isPerson = contactTypeUtils.isPerson(config.getAll(), change.doc);
    return transitionUtils
      .getUniqueId()
      .then(id => {
        const prop = isPerson ? 'patient_id' : 'place_id';
        change.doc[prop] = id;
        return true;
      });
  },
  asynchronousOnly: true
};
