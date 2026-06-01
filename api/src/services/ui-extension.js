const db = require('../db');

const PREFIX = 'ui-extension:';

const getExtensionDoc = (name) => {
  return db.medic.get(`${PREFIX}${name}`, { attachments: true })
    .catch(err => {
      if (err.status === 404) {
        return;
      }
      throw err;
    });
};

module.exports = {
  isExtensionChange: ({ id }) => id.startsWith(PREFIX),

  getScript: async (name) => {
    const doc = await getExtensionDoc(name);
    const attachment = doc?._attachments?.['extension.js'];
    if (!attachment) {
      return null;
    }

    return {
      data: attachment.data,
    };
  },
  
  getAllProperties: async () => {
    const result = await db.medic.allDocs({
      startkey: PREFIX,
      endkey: `${PREFIX}\ufff0`,
      include_docs: true,
    });
    
    return result.rows.map(row => {
      const doc = row.doc;
      const id = doc._id.replace(PREFIX, '');

      const properties = { id };
      // Do not include CouchDB specific fields (starting with '_')
      Object.keys(doc)
        .filter(key => !key.startsWith('_'))
        .forEach((key) => properties[key] = doc[key]);
      return properties;
    });
  }
};
