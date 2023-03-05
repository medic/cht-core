const db = require('../db');

const DOC_ID = 'extension-libs';

const getLibsDoc = async () => {
  try {
    return await db.medic.get(DOC_ID, { attachments: true });
  } catch (err) {
    if (err.status === 404) {
      // no doc means no configured libs
      return;
    }
    throw err;
  }
};

module.exports = {
  isLibChange: (change) => (change && change.id) === DOC_ID,
  getAll: async () => {
    const doc = await getLibsDoc();
    if (!doc || !doc._attachments) {
      return [];
    }
    return Object.entries(doc._attachments).map(([ name, attachment ]) => ({ name, attachment }));
  },
  get: async (libName) => {
    const doc = await getLibsDoc();
    const attachment = doc && doc._attachments && doc._attachments[libName];
    if (attachment) {
      return {
        data: attachment.data,
        contentType: attachment.content_type
      };
    }
  }
};
