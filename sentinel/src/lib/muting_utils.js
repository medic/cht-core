const _ = require('underscore'),
      db = require('../db-pouch'),
      lineage = require('lineage')(Promise, db.medic),
      utils = require('./utils');

const SUBJECT_PROPERTIES = ['_id', 'patient_id', 'place_id'],
      BATCH_SIZE = 50;

const getContact = doc => {
  const contactId = doc.fields.patient_id || doc.fields.place_id || doc.fields.patient_uuid;

  return db.medic
    .allDocs({ key: contactId })
    .then(result => {
      if (!result.rows.length) {
        return db.medic.query('medic-client/contacts_by_reference', { key: [ 'shortcode', contactId ] });
      }
      return result;
    })
    .then(result => {
      if (!result.rows.length) {
        throw(new Error('contact_not_found'));
      }
      return lineage.fetchHydratedDoc(result.rows[0].id);
    });
};

const getDescendants = (contactId) => {
  return db.medic
    .query('medic/contacts_by_depth', { key: [contactId] })
    .then(result => result.rows.map(row => row.id));
};

const updateRegistration = (dataRecord, muted) => {
  return muted ? utils.muteScheduledMessages(dataRecord) : utils.unmuteScheduledMessages(dataRecord);
};

const updateContacts = (contacts, muted) => {
  contacts = contacts.filter(contact => {
    if (Boolean(contact.muted) === muted) {
      return false;
    }
    return updateContact(contact, muted);
  });

  if (!contacts.length) {
    return;
  }

  return db.medic.bulkDocs(contacts);
};

const updateContact = (contact, muted) => {
  contact.muted = muted ? new Date().getTime() : false;
  return contact;
};

const updateRegistrations = (subjectIds, muted) => {
  if (!subjectIds.length) {
    return Promise.resolve([]);
  }

  return utils
    .getReportsBySubject({ db: db.medic, ids: subjectIds, registrations: true })
    .then(registrations => {
      registrations = registrations.filter(registration => updateRegistration(registration, muted));
      if (!registrations.length) {
        return;
      }
      return db.medic.bulkDocs(registrations);
    });
};

const getSubjectIds = contact => _.values(_.pick(contact, SUBJECT_PROPERTIES));

const getContactsAndSubjectIds = (contactIds) => {
  return db.medic
    .allDocs({ keys: contactIds, include_docs: true })
    .then(result => {
      const contacts   = [],
            subjectIds = [];

      result.rows.forEach(row => {
        if (!row.doc) {
          return;
        }
        contacts.push(row.doc);
        subjectIds.push(...getSubjectIds(row.doc));
      });

      return { contacts, subjectIds };
    });
};

const updateMuteState = (contact, muted) => {
  let rootContactId;
  if (muted) {
    rootContactId = contact._id;
  } else {
    let parent = contact;
    while (parent && parent.muted) {
      rootContactId = parent._id;
      parent = parent.parent;
    }
  }

  return getDescendants(rootContactId).then(contactIds => {
    const batches = [];
    while (contactIds.length) {
      batches.push(contactIds.splice(0, BATCH_SIZE));
    }

    return batches
      .reduce((promise, batch) => {
        return promise
          .then(() => getContactsAndSubjectIds(batch))
          .then(result => Promise.all([
                            updateContacts(result.contacts, muted),
                            updateRegistrations(result.subjectIds, muted)
                          ]));
      }, Promise.resolve())
      .then(() => true);
  });
};

const isMutedInLineage = doc => {
  let muted = false;
  if (!doc || !doc.parent) {
    return muted;
  }

  let parent = doc.parent;
  while (parent && !muted) {
    muted = !!parent.muted;
    parent = parent.parent;
  }

  return muted;
};

module.exports = {
  updateMuteState: updateMuteState,
  updateContact: updateContact,
  getContact: getContact,
  updateRegistrations: updateRegistrations,
  getSubjectIds: getSubjectIds,
  isMutedInLineage: isMutedInLineage,
  _getContactsAndSubjectIds: getContactsAndSubjectIds,
  _updateContacts: updateContacts,
  _lineage: lineage
};
