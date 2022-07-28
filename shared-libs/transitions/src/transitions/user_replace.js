/* eslint-disable no-console */
const url = require('url');
const rpn = require('request-promise-native');
const db = require('../db');
const transitionUtils = require('./utils');

const NAME = 'user_replace';

/**
 * Replace a contact with a new contact.
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
    const parsedUrl = url.parse(db.couchUrl);
    const separatorIndex = parsedUrl.auth.indexOf(':');
    const username = parsedUrl.auth.substring(0, separatorIndex);
    const password = parsedUrl.auth.substring(separatorIndex + 1);

    const doc = change.doc;
    return rpn.post({
      url: 'http://localhost:5988/api/v1/user-replace',
      json: true,
      body: { reportId: doc._id },
      auth: { user: username, pass: password },
    })
      .then(() => true)
      .catch(() => false);
  }
};
