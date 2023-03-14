const transitionUtils = require('./utils');
const db = require('../db');
const lineage = require('@medic/lineage')(Promise, db.medic);
const utils = require('../lib/utils');
const contactTypesUtils = require('@medic/contact-types-utils');
const NAME = 'update_clinics';
const FACILITY_NOT_FOUND = 'sys.facility_not_found';

const config = require('../config');

const getConfig = () => config.get(NAME) || [];

const getConfiguredForm = (form) => getConfig().find(item => item && item.form === form);

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
      const contactType = contactTypesUtils.getContactType(config.getAll(), result);
      // not a contact
      if (!contactType) {
        return;
      }
      // person
      if (contactType.person) {
        return lineage.fetchHydratedDoc(result._id);
      }

      // place
      const id = result.contact && result.contact._id;
      if (!id) {
        return result.contact || { parent: result };
      }

      return lineage.fetchHydratedDoc(id);
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
  name: NAME,
  filter: ({ doc, info }) => {
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
        if (form) {
          const formConfig = getConfiguredForm(change.doc.form) || {};
          transitionUtils.addRejectionMessage(change.doc, formConfig, FACILITY_NOT_FOUND);
          return true;
        }

        const message = utils.translate(FACILITY_NOT_FOUND, utils.getLocale(change.doc));
        const error = {
          code: FACILITY_NOT_FOUND,
          message
        };
        utils.addError(change.doc, error);
        return true;
      }
    });
  },
  _lineage: lineage,
};
