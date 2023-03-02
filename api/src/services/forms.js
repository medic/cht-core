/**
 * @module forms
 */
const db = require('../db');
const FORM_DOC_ID_PREFIX = 'form:';
const DOC_TYPE = 'form';

module.exports = {

  /**
   * @param {Object} doc The doc to find the xform attachment on.
   * @return {String} The xform xml content.
   */
  getXFormAttachment: doc => {
    const name = Object.keys(doc && doc._attachments || {})
      .find(name => name === 'xml' ||
            (name.endsWith('.xml') && name !== 'model.xml'));
    return name && doc._attachments[name];
  },

  /**
   * @return {Promise} Resolves all the documents of type 'form'
   *   with a valid xform attachment.
   */
  getFormDocs: () => {
    return db.medic
      .allDocs({
        startkey: FORM_DOC_ID_PREFIX,
        endkey: `${FORM_DOC_ID_PREFIX}\ufff0`,
        include_docs: true,
        attachments: true,
        binary: true,
      })
      .then(response => {
        return response.rows
          .map(row => row.doc)
          .filter(doc => doc && doc.type === DOC_TYPE && module.exports.getXFormAttachment(doc));
      });
  },
};
