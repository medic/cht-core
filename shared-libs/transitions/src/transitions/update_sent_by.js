const transitionUtils = require('./utils');
const dataContext = require('../data-context');
const NAME = 'update_sent_by';
const { Contact } = require('@medic/cht-datasource');
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
    const qualifier = transitionUtils.senderPhoneQualifier(doc);
    if (!qualifier) {
      return Promise.resolve();
    }

    const getContactDocs = dataContext.bind(Contact.v1.getPage);

    return getContactDocs(qualifier, null, 1)
      .then(page => {
        const sentBy = page.data.length && page.data[0].name;

        if (sentBy) {
          doc.sent_by = sentBy;
          return true;
        }
      });
  }
};
