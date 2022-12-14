const db = require('../db');

const getLibsDoc = async () => await db.medic.get('libs', { attachments: true });

module.exports = {
  // offline users will only receive `doc`+`rev` pairs they are allowed to see
  getAll: async () => {
    const doc = await getLibsDoc();
    const result = {};
    for (const [key, value] of Object.entries(doc._attachments)) {
      result[key] = value.data;
    }
    return result;
  },
  get: async (libName) => {
    const doc = await getLibsDoc();
    const attachment = doc._attachments[libName];
    return {
      data: attachment.data,
      contentType: attachment.content_type
    };
  }
};
