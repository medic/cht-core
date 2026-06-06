const transitionUtils = require('./utils');
const db = require('../db');
const NAME = 'update_sent_by';
const { DOC_TYPES } = require('@medic/constants');

module.exports = {
  name: NAME,
  filter: function({ doc, info }) {
    const self = module.exports;
    return Boolean(
      doc &&
            doc.from &&
            doc.type === DOC_TYPES.DATA_RECORD &&
            doc.sent_by === undefined &&
            !self._hasRun(info)
    );
  },
  _hasRun: function(doc) {
    return Boolean(
      transitionUtils.hasRun(doc, NAME) &&
            doc.transitions[NAME].ok
    );
  },
  onMatch: change => {
    const doc = change.doc;

    return db.medic
      .query('medic-client/contacts_by_phone', { key: doc.from, include_docs: true })
      .then(result => {
        const sentBy = result.rows &&
                             result.rows.length &&
                             result.rows[0].doc &&
                             result.rows[0].doc.name;

        if (sentBy) {
          doc.sent_by = sentBy;
          return true;
        }
      });
  }
};
