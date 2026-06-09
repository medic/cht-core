const db = require('../db');

const { DOC_TYPES, PREFIXES } = require('@medic/constants');

const ATTACHMENT_NAME = 'extension.js';

const getExtensionDoc = (name, options = {}) => db.medic
  .get(`${PREFIXES.UI_EXTENSION}${name}`, options)
  .then(doc => doc.type === DOC_TYPES.UI_EXTENSION ? doc : null)
  .catch(err => {
    if (err.status === 404) {
      return null;
    }
    throw err;
  });

module.exports = {
  isExtensionChange: ({ id }) => id.startsWith(PREFIXES.UI_EXTENSION),

  getScript: async (name) => {
    const doc = await getExtensionDoc(name, { attachments: true });
    const attachment = doc?._attachments?.[ATTACHMENT_NAME];
    if (!attachment) {
      return null;
    }

    return {
      data: attachment.data,
    };
  },

  getScriptDigest: async (name) => {
    const doc = await getExtensionDoc(name);
    return doc?._attachments?.[ATTACHMENT_NAME]?.digest || null;
  },

  getAllProperties: async () => {
    const result = await db.medic.allDocs({
      startkey: PREFIXES.UI_EXTENSION,
      endkey: `${PREFIXES.UI_EXTENSION}\ufff0`,
      include_docs: true,
    });
    
    return result.rows
      .map(({ doc }) => doc)
      .filter(({ type }) => type === DOC_TYPES.UI_EXTENSION)
      .map(doc => {
        const id = doc._id.replace(PREFIXES.UI_EXTENSION, '');

        const properties = { id };
        // Do not include CouchDB specific fields (starting with '_')
        Object.keys(doc)
          .filter(key => !key.startsWith('_'))
          .filter(key => key !== 'type')
          .forEach((key) => properties[key] = doc[key]);
        return properties;
      });
  }
};
