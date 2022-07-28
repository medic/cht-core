/* eslint-disable no-console */
const transitionUtils = require('./utils');
const NAME = 'user_replace';

/**
 * Replace a conatc with a the new contact.
 */
module.exports = {
  name: NAME,
  filter: (doc, info = {}) => {
    return Boolean(
      doc &&
      doc.type === 'person' &&
      doc.secret_code &&
      !transitionUtils.hasRun(info, NAME)
    );
  },
  onMatch: change => {

    // reparent and send magic link here
  }
};
