const transitionUtils = require('./utils'),
  db = require('../db'),
  lineage = require('@medic/lineage')(Promise, db.medic),
  utils = require('../lib/utils'),
  NAME = 'update_clinics',
  FACILITY_NOT_FOUND = 'sys.facility_not_found';

const getContactByRefid = doc => {
  const params = {
    key: ['external', doc.refid],
    include_docs: true,
    limit: 1,
  };

  return db.medic
    .query('medic-client/contacts_by_reference', params)
    .then(data => {
      if (!data.rows.length) {
        return;
      }

      const result = data.rows[0].doc;
      if (result.type === 'person') {
        return lineage.fetchHydratedDoc(result._id);
      } else {
        const id = result.contact && result.contact._id;
        if (!id) {
          return result.contact || { parent: result };
        }

        return lineage.fetchHydratedDoc(id);
      }
    });
};

const getContactByPhone = doc => {
  const params = {
    key: String(doc.from),
    include_docs: false,
    limit: 1,
  };

  return db.medic
    .query('medic-client/contacts_by_phone', params)
    .then(data => {
      if (!data.rows.length || !data.rows[0].id) {
        return;
      }

      return lineage.fetchHydratedDoc(data.rows[0].id);
    });
};

const getContact = doc => {
  if (doc.refid) {
    return getContactByRefid(doc);
  }

  if (doc.from) {
    return getContactByPhone(doc);
  }

  return Promise.resolve();
};

/**
 * Update clinic data on new data records, use refid for clinic lookup otherwise
 * phone number.
 */
module.exports = {
  filter: (doc, info = {}) => {
    return Boolean(
      doc &&
        doc.type === 'data_record' &&
        !doc.contact &&
        !transitionUtils.hasRun(info, NAME)
    );
  },
  onMatch: change => {
    return getContact(change.doc).then(contact => {
      if (contact) {
        change.doc.contact = contact;
        return true;
      }

      if (utils.isXFormReport(change.doc)) {
        return;
      }

      const form = change.doc.form && utils.getForm(change.doc.form);
      if (!form || !form.public_form) {
        const error = {
          code: FACILITY_NOT_FOUND,
          message: utils.translate(FACILITY_NOT_FOUND, utils.getLocale(change.doc))
        };
        utils.addError(change.doc, error);
        return true;
      }
    });
  },
  _lineage: lineage,
};
