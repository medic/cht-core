/* eslint-disable no-console */
const rpn = require('request-promise-native');
const environment = require('../environment');
const transitionUtils = require('./utils');

const NAME = 'user_replace';

/**
 * Replace a contact with a new contact.
 */
module.exports = {
  name: NAME,
  filter: (doc, info = {}) => {
    console.log("doc", doc);
    return Boolean(
      doc &&
      doc.form === 'replace_user' &&
      !transitionUtils.hasRun(info, NAME)
    );
  },
  onMatch: change => {
    return rpn.post({
      url: `${environment.apiUrl}/api/v1/user-replace`,
      json: true,
      body: { reportId: change.doc._id },
      auth: { user: environment.username, pass: environment.password },
    })
      .then(() => true)
      .catch(() => false);
  }
};
