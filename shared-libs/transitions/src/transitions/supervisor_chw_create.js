/* eslint-disable no-console */
const rpn = require('request-promise-native');
const environment = require('../environment');
const transitionUtils = require('./utils');

const NAME = 'supervisor_chw_create';

/**
 * Create a CHW user account from a supervisor-specific form submission.
 */
module.exports = {
  name: NAME,
  filter: (doc, info = {}) => {
    return Boolean(
      doc &&
      doc.form === 'supervisor_chw_create' &&
      !transitionUtils.hasRun(info, NAME)
    );
  },
  onMatch: change => {
    return Promise.resolve(true);
    /*return rpn.post({
      url: `${environment.apiUrl}/api/v1/users`,
      json: true,
      body: {
        username: change.doc.fields.username,
        // TODO
      },
      auth: { user: environment.username, pass: environment.password },
    })
      .then(() => true)
      .catch(() => false);*/
  }
};
