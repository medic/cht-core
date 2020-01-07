const logger = require('../lib/logger');
const generateShortcodeOnContacts = require('./generate_shortcode_on_contacts');

// As of 3.8.0, generates a shortcode for every configured contact type.
module.exports = {
  init: () => {
    logger.warn(
      '"generate_patient_id_on_people" transition is deprecated. ' +
      'Please use "generate_shortcode_on_contacts" transition instead.'
    );
  },

  filter: (doc) => generateShortcodeOnContacts.filter(doc),
  onMatch: (change) => generateShortcodeOnContacts.onMatch(change),
  asynchronousOnly: true
};
