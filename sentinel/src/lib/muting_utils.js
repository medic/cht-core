const _ = require('underscore'),
      db = require('../db-pouch'),
      lineage = require('lineage')(Promise, db.medic),
      utils = require('./utils'),
      moment = require('moment');

const SUBJECT_PROPERTIES = ['_id', 'patient_id', 'place_id'],
      BATCH_SIZE = 50;

const getContact = doc => {
  const contactId = doc.fields &&
                    (
                      doc.fields.patient_id ||
                      doc.fields.place_id ||
                      doc.fields.patient_uuid
                    );

  if (!contactId) {
    return Promise.reject(new Error('contact_not_found'));
  }

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
  return muted ? muteUnsentMessages(dataRecord) : unmuteMessages(dataRecord);
};

const updateContacts = (contacts, muted) => {
  contacts = contacts.filter(contact => {
    return Boolean(contact.muted) !== muted ? updateContact(contact, muted) : false;
  });

  if (!contacts.length) {
    return;
  }

  return db.medic.bulkDocs(contacts);
};

const updateContact = (contact, muted) => {
  contact.muted = muted ? moment().valueOf() : false;
  return contact;
};

const updateRegistrations = (subjectIds, muted) => {
  if (!subjectIds.length) {
    return Promise.resolve();
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
    while (parent) {
      rootContactId = parent.muted ? parent._id : rootContactId;
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
  let parent = doc && doc.parent;
  while (parent) {
    if (parent.muted) {
      return true;
    }
    parent = parent.parent;
  }
  return false;
};

const unmuteMessages = doc => {
  // only schedule tasks that have a due date in the present or future
  return utils.setTasksStates(doc, 'scheduled', task => {
    return task.state === 'muted' &&
           moment(task.due) >= moment().startOf('day');
  });
};

const muteUnsentMessages = doc => {
  return utils.setTasksStates(doc, 'muted', task => {
    return task.state === 'scheduled' ||
           task.state === 'pending';
  });
};

module.exports = {
  updateMuteState: updateMuteState,
  updateContact: updateContact,
  getContact: getContact,
  updateRegistrations: updateRegistrations,
  getSubjectIds: getSubjectIds,
  isMutedInLineage: isMutedInLineage,
  unmuteMessages: unmuteMessages,
  muteUnsentMessages: muteUnsentMessages,
  _getContactsAndSubjectIds: getContactsAndSubjectIds,
  _updateContacts: updateContacts,
  _lineage: lineage
};
