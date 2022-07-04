const db = require('../db');
const logger = require('../logger');
const sanitizeHtml = require('sanitize-html');

const PRIVACY_POLICY_DOC_ID = 'privacy-policies';

const getAttachment = (doc) => {
  const policies = doc.privacy_policies;
  const first = Object.keys(policies)[0]; // TODO find the right one for this lang
  const data = doc._attachments[policies[first]].data;
  const html = Buffer.from(data, 'base64').toString();
  return sanitizeHtml(html);
};

module.exports = {
  get: () => {
    return db.medic.get(PRIVACY_POLICY_DOC_ID, { attachments: true })
      .then(doc => getAttachment(doc))
      .catch(err => {
        if (err.status !== 404) {
          logger.error('Error retrieving privacy policies: %o', err);
        }
        throw err;
      });
  },
  exists: () => {
    return db.medic.get(PRIVACY_POLICY_DOC_ID)
      .then(() => true)
      .catch(() => false);
  }
};
