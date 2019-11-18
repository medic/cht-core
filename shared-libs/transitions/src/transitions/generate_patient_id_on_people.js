const config = require('../config');
const transitionUtils = require('./utils');
const contactTypeUtils = require('@medic/contact-types-utils');

// As of 3.8.0, generates a shortcode for every configured contact type.
module.exports = {
  filter: doc => {
    const contactType = contactTypeUtils.getContactType(config.getAll(), doc);
    if (!contactType) {
      return;
    }

    if (contactTypeUtils.isPersonType(contactType) && doc.patient_id) {
      return; // person type that already had patient_id
    }

    if (contactTypeUtils.isPlaceType(contactType) && doc.place_id) {
      return; // contact type that already has place_id
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
