const config = require('../config');
const transitionUtils = require('./utils');
const contactTypeUtils = require('@medic/contact-types-utils');
const NAME = 'generate_shortcode_on_contacts';

module.exports = {
  name: NAME,
  asynchronousOnly: true,
  filter: ({ doc }) => {
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
    return transitionUtils
      .getUniqueId()
      .then(id => {
        const isPerson = contactTypeUtils.isPerson(config.getAll(), change.doc);
        const prop = isPerson ? 'patient_id' : 'place_id';
        change.doc[prop] = id;
        return true;
      });
  }
};
