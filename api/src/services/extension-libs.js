const db = require('../db');
const { DOC_IDS } = require('@medic/constants');

const getLibsDoc = () => {
  return db.medic.get(DOC_IDS.EXTENSION_LIBS, { attachments: true })
    .catch(err => {
      if (err.status === 404) {
        // no doc means no configured libs
        return;
      }
      throw err;
    });
};

const formatResult = (name, attachment) => {
  return {
    name,
    data: attachment.data,
    contentType: attachment.content_type
  };
};

module.exports = {
  isLibChange: (change) => (change && change.id) === DOC_IDS.EXTENSION_LIBS,
  getAll: async () => {
    const doc = await getLibsDoc();
    if (!doc || !doc._attachments) {
      return [];
    }
    return Object.entries(doc._attachments).map(([ name, attachment ]) => formatResult(name, attachment));
  },
  get: async (name) => {
    const doc = await getLibsDoc();
    const attachment = doc && doc._attachments && doc._attachments[name];
    if (attachment) {
      return formatResult(name, attachment);
    }
  }
};
