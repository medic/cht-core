const sanitizeHtml = require('sanitize-html');
const db = require('../db');
const logger = require('../logger');
const config = require('../config');

const PRIVACY_POLICY_DOC_ID = 'privacy-policies';

const getAttachmentName = (doc, locale) => {
  const policies = doc.privacy_policies;
  return policies[locale] || policies.en || Object.values(policies)[0];
};

const getAttachment = (doc, locale) => {
  const attachmentName = getAttachmentName(doc, locale);
  const data = doc._attachments[attachmentName].data;
  const html = Buffer.from(data, 'base64').toString();
  return sanitizeHtml(html);
};

const getDoc = (options=({})) => {
  return db.medic.get(PRIVACY_POLICY_DOC_ID, options)
    .then(doc => {
      const policies = doc.privacy_policies;
      if (!policies || !Object.keys(policies).length) { // invalid doc
        throw new Error(`Invalid ${PRIVACY_POLICY_DOC_ID} doc: missing required "privacy_policies" property`);
      }
      return doc;
    })
    .catch(err => {
      if (err.status !== 404) {
        logger.error('Error retrieving privacy policies: %o', err);
      }
      throw err;
    });
};

module.exports = {
  get: (locale) => {
    locale = locale || config.get('locale');
    return getDoc({ attachments: true })
      .then(doc => getAttachment(doc, locale));
  },
  exists: () => {
    return getDoc()
      .then(() => true)
      .catch(() => false);
  }
};
