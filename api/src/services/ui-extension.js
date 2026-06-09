const db = require('../db');

const TYPE = 'ui-extension';
const PREFIX = `${TYPE}:`;

const getExtensionDoc = (name) => db.medic
  .get(`${PREFIX}${name}`, { attachments: true })
  .then(doc => doc.type === TYPE ? doc : null)
const ATTACHMENT_NAME = 'extension.js';

const getExtensionDoc = (name, options = {}) => db.medic
  .catch(err => {
    if (err.status === 404) {
      return null;
    }
    throw err;
  });

module.exports = {
  isExtensionChange: ({ id }) => id.startsWith(PREFIX),

  getScript: async (name) => {
    const doc = await getExtensionDoc(name);
    const attachment = doc?._attachments?.['extension.js'];
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
      startkey: PREFIX,
      endkey: `${PREFIX}\ufff0`,
      include_docs: true,
    });
    
    return result.rows
      .map(({ doc }) => doc)
      .filter(({ type }) => type === TYPE)
      .map(doc => {
        const id = doc._id.replace(PREFIX, '');

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
