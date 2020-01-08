/**
 * @module forms
 */
const db = require('../db');

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
    const options = {
      key: ['form'],
      include_docs: true,
      attachments: true,
      binary: true,
    };
    return db.medic.query('medic-client/doc_by_type', options)
      .then(response => response.rows.filter(row => module.exports.getXFormAttachment(row.doc)))
      .then(rows => rows.map(row => row.doc));
  }

};
