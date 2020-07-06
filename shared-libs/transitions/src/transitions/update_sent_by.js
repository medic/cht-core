const transitionUtils = require('./utils');
const db = require('../db');

module.exports = {
  name: 'update_sent_by',
  deprecated: false,
  deprecatedIn: '',
  getDeprecationMessage: () => {
    const self = module.exports;
    return `"${self.name}" transition is deprecated in ${self.deprecatedIn}.`;
  },
  filter: function(doc, info={}) {
    const self = module.exports;
    return Boolean(
      doc &&
            doc.from &&
            doc.type === 'data_record' &&
            doc.sent_by === undefined &&
            !self._hasRun(info)
    );
  },
  _hasRun: function(doc) {
    const self = module.exports;
    return Boolean(
      transitionUtils.hasRun(doc, self.name) &&
            doc.transitions[self.name].ok
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
