const config = require('../config');
const transitionUtils = require('./utils');

module.exports = {
  filter: doc => {
    if (doc.place_id) {
      // already has a place_id
      return;
    }
    const typeId = (doc.type === 'contact' && doc.contact_type) || doc.type;
    const contactTypes = config.get('contact_types') || [];
    const type = contactTypes.find(type => type.id === typeId);
    return type && !type.person;
  },
  onMatch: change => {
    return transitionUtils
      .getUniqueId()
      .then(id => {
        change.doc.place_id = id;
        return true;
      });
  },
  asynchronousOnly: true
};
