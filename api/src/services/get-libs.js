const db = require('../db');

const getLibsDoc = async () => {
  try {
    return await db.medic.get('libs', { attachments: true });
  } catch (err) {
    return {};
  }
};

module.exports = {
  // offline users will only receive `doc`+`rev` pairs they are allowed to see
  getAll: async () => {
    const doc = await getLibsDoc();
    const result = {};
    if (doc && doc._attachments) {
      for (const [key, value] of Object.entries(doc._attachments)) {
        result[key] = value.data;
      }
    }
    return result;
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
    return {};
  }
};
