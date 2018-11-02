const _ = require('underscore'),
  logger = require('../lib/logger'),
  transitionUtils = require('./utils'),
  db = require('../db-nano'),
  dbPouch = require('../db-pouch'),
  lineage = require('lineage')(Promise, dbPouch.medic),
  NAME = 'update_clinics';

const associateContact = (doc, contact, callback) => {
  const self = module.exports;

  // reporting phone stayed the same and contact data is up to date
  if (
    doc.from === contact.phone &&
    doc.contact &&
    contact._id === doc.contact._id
  ) {
    return callback();
  }

  if (contact.phone !== doc.from) {
    contact.phone = doc.from;
    dbPouch.medic.put(contact, err => {
      if (err) {
        logger.error(`Error updating contact: ${JSON.stringify(err, null, 2)}`);
        return callback(err);
      }
      self.setContact(doc, contact, callback);
    });
  } else {
    self.setContact(doc, contact, callback);
  }
};

const getHydratedContact = (id, callback) => {
  return lineage
    .fetchHydratedDoc(id)
    .then(contact => {
      callback(null, contact);
    })
    .catch(err => {
      callback(err);
    });
};

const getContact = (doc, callback) => {
  if (doc.refid) {
    // use reference id to find clinic if defined
    let params = {
      key: ['external', doc.refid],
      include_docs: true,
      limit: 1,
    };
    db.medic.view(
      'medic-client',
      'contacts_by_reference',
      params,
      (err, data) => {
        if (err) {
          return callback(err);
        }
        if (!data.rows.length) {
          return callback();
        }
        const result = data.rows[0].doc;
        if (result.type === 'person') {
          return getHydratedContact(result._id, callback);
        }
        if (result.type === 'clinic') {
          const id = result.contact && result.contact._id;
          if (!id) {
            return callback(null, result.contact || { parent: result });
          }

          return getHydratedContact(id, callback);
        }
        callback();
      }
    );
  } else if (doc.from) {
    let params = {
      key: String(doc.from),
      include_docs: false,
      limit: 1,
    };
    db.medic.view('medic-client', 'contacts_by_phone', params, (err, data) => {
      if (err) {
        return callback(err);
      }
      if (data.rows.length && data.rows[0].id) {
        return getHydratedContact(data.rows[0].id, callback);
      }
      return callback();
    });
  } else {
    callback();
  }
};

/**
 * Update clinic data on new data records, use refid for clinic lookup otherwise
 * phone number.
 *
 * Also update phone number on clinic data when phone number is different. We
 * try to keep the phone number updated so when we setup reminders we have a
 * good place to get phone numbers from.
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
    return new Promise((resolve, reject) => {
      getContact(change.doc, (err, contact) => {
        if (err) {
          return reject(err);
        }
        if (!contact) {
          return resolve();
        }
        associateContact(change.doc, contact, (err, changed) => {
          if (err) {
            return reject(err);
          }
          resolve(changed);
        });
      });
    });
  },
  setContact: (doc, contact, callback) => {
    doc.contact = contact;
    // remove facility not found errors
    doc.errors = _.reject(doc.errors, error => {
      return error.code === 'sys.facility_not_found';
    });
    callback(null, true);
  },
  _lineage: lineage,
};
