const config = require('../config');
const transitionUtils = require('./utils');
const contactTypeUtils = require('@medic/contact-types-utils');

module.exports = {
  filter: doc => {
    const contactTypeId = contactTypeUtils.getTypeId(doc);
    const contactType = contactTypeUtils.getTypeById(config, contactTypeId);

    if (!contactType ||
        (contactType.person && doc.patient_id) ||
        (!contactType.person && doc.place_id)) {
      return;
    }

    return true;
  },
  onMatch: change => {
    const contactTypeId = contactTypeUtils.getTypeId(change.doc);
    const contactType = contactTypeUtils.getTypeById(config, contactTypeId);
    return transitionUtils
      .getUniqueId()
      .then(id => {
        const prop = contactType.person ? 'patient_id' : 'place_id';
        change.doc[prop] = id;
        return true;
      });
  },
  asynchronousOnly: true
};
