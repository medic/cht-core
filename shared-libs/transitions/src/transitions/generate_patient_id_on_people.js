const logger = require('../lib/logger');
const generateShortcodeOnContacts = require('./generate_shortcode_on_contacts');

// As of 3.8.0, generates a shortcode for every configured contact type.
module.exports = {
  name: 'generate_patient_id_on_people',
  asynchronousOnly: true,
  deprecated: true,
  deprecatedIn: '3.8.x',
  init: () => {
    const self = module.exports;

    if (self.deprecated) {
      logger.warn(self.getDeprecationMessage());
    }
  },
  getDeprecationMessage: () => {
    const self = module.exports;
    const deprecatedExtraInfo = 'Please use "generate_shortcode_on_contacts" transition instead.';

    return `"${self.name}" transition is deprecated in ${self.deprecatedIn}. ${deprecatedExtraInfo}`;
  },
  filter: (doc) => generateShortcodeOnContacts.filter(doc),
  onMatch: (change) => generateShortcodeOnContacts.onMatch(change)
};
