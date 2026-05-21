const transitionUtils = require('./utils');
const NAME = 'update_sent_by';
const { DOC_TYPES } = require('@medic/constants');
const { Contact, Qualifier } = require('@medic/cht-datasource');
const dataContext = require('../data-context');

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
    const getContactUuids = dataContext.bind(Contact.v1.getUuidsPage);
    const getContact = dataContext.bind(Contact.v1.get);

    return getContactUuids(Qualifier.byPhone(doc.from), null, 1)
      .then(page => page.data.length && getContact(Qualifier.byUuid(page.data[0])))
      .then(contact => {
        const sentBy = contact && contact.name;

        if (sentBy) {
          doc.sent_by = sentBy;
          return true;
        }
      });
  }
};
