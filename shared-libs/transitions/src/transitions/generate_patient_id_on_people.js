const logger = require('../lib/logger');
const generateShortcodeOnContacts = require('./generate_shortcode_on_contacts');
const transitionUtils = require('./utils');
const NAME = 'generate_patient_id_on_people';

// As of 3.8.0, generates a shortcode for every configured contact type.
module.exports = {
  name: NAME,
  asynchronousOnly: true,
  deprecated: true,
  deprecatedIn: '3.8.x',
  init: () => {
    const self = module.exports;
    logger.warn(self.getDeprecationMessage());
  },
  getDeprecationMessage: () => {
    const self = module.exports;
    const deprecatedExtraInfo = 'Please use "generate_shortcode_on_contacts" transition instead.';

    return transitionUtils.getDeprecationMessage(self.name, self.deprecatedIn, deprecatedExtraInfo);
  },
  filter: (change) => generateShortcodeOnContacts.filter(change),
  onMatch: (change) => generateShortcodeOnContacts.onMatch(change)
};
