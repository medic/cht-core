/**
 * @module forms
 */
const db = require('../db');
const FORM_DOC_ID_PREFIX = 'form:';
const DOC_TYPE = 'form';
const logger = require('@medic/logger');


module.exports = {

  /**
   * @param {Object} doc The doc to find the name of xform attachment on.
   * @return {String} The name of xform xml attachment.
   */
  getXFormAttachmentName: doc => {
    return Object.keys(doc && doc._attachments || {})
      .find(name => name === 'xml' ||
        (name.endsWith('.xml') && name !== 'model.xml'));
  },

  /**
   * @param {Object} doc The doc to find the xform attachment on.
   * @return {String} The xform xml content.
   */
  getXFormAttachment: doc => {
    const name = module.exports.getXFormAttachmentName(doc);
    return name && doc._attachments[name];
  },

  getAttachment: async (doc_id, name) => {
    try {
      return await db.medic.getAttachment(doc_id, name);
    } catch (error) {
      if (error.status === 404) {
        logger.error(error);
        return null;
      }
      throw error;
    }
  },
  /**
   * @return {Promise} Resolves all the documents of type 'form'
   *   with a valid xform attachment.
   */
  getFormDocs: async () => {
    const response = await db.medic.allDocs({
      startkey: FORM_DOC_ID_PREFIX,
      endkey: `${FORM_DOC_ID_PREFIX}\ufff0`,
      include_docs: true,
    });

    const docs = await Promise.all(response.rows.map(async row => {
      const doc = row.doc;
      const name = module.exports.getXFormAttachmentName(doc);
      if (doc.type !== DOC_TYPE || !name) {
        return null;
      }

      const xml = await module.exports.getAttachment(doc._id, name);
      if (!xml){
        return;
      }
      doc._attachments[name].data =  Buffer.from(xml);
      return doc;
    }));
    return docs.filter(Boolean);

  },
};
