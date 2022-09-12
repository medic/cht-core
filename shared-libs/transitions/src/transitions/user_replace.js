const rpn = require('request-promise-native');
const environment = require('../environment');
const transitionUtils = require('./utils');
const config = require('../config');

const NAME = 'user_replace';

/**
 * Replace a contact with a new contact.
 */
module.exports = {
  name: NAME,
  init: () => {
    const tokenLogin = config.get('token_login');
    if (!tokenLogin || !tokenLogin.enabled) {
      throw new Error(`Configuration error. Token login must be enabled to use the user_replace transition.`);
    }
  },
  filter: (doc, info = {}) => {
    return doc.form === 'replace_user'
      && !transitionUtils.hasRun(info, NAME);
  },
  onMatch: change => {
    return rpn.post({
      url: `${environment.apiUrl}/api/v1/user-replace`,
      json: true,
      body: { reportId: change.doc._id },
      auth: { user: environment.username, pass: environment.password },
    })
      .then(() => true)
      .catch(err => {
        err.changed = true;
        throw err;
      });
  }
};
