const db = require('../db-pouch'),
      lineage = require('@medic/lineage')(Promise, db.medic),
      utils = require('./utils'),
      moment = require('moment'),
      infodoc = require('./infodoc');

const BATCH_SIZE = 50;

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
  if (!contacts.length) {
    return Promise.resolve();
  }

  contacts.forEach(contact => updateContact(contact, muted));
  return db.medic.bulkDocs(contacts);
};

const updateContact = (contact, muted) => {
  if (muted) {
    contact.muted = muted;
  } else {
    delete contact.muted;
  }

  return contact;
};

const updateRegistrations = (subjectIds, muted) => {
  if (!subjectIds.length) {
    return Promise.resolve();
  }

  return utils
    .getReportsBySubject({ ids: subjectIds, registrations: true })
    .then(registrations => {
      registrations = registrations.filter(registration => updateRegistration(registration, muted));
      if (!registrations.length) {
        return;
      }
      return db.medic.bulkDocs(registrations);
    });
};

const getContactsAndSubjectIds = (contactIds, muted) => {
  return db.medic
    .allDocs({ keys: contactIds, include_docs: true })
    .then(result => {
      const contacts   = [],
            subjectIds = [];

      result.rows.forEach(row => {
        if (!row.doc || Boolean(row.doc.muted) === Boolean(muted)) {
          return;
        }
        contacts.push(row.doc);
        subjectIds.push(...utils.getSubjectIds(row.doc));
      });

      return { contacts, subjectIds };
    });
};

const updateMutingHistories = (contacts, muted, reportId) => {
  if (!contacts.length) {
    return Promise.resolve();
  }

  return infodoc
    .bulkGet(contacts.map(contact => ({ id: contact._id })))
    .then(infoDocs => infoDocs.map(info => addMutingHistory(info, muted, reportId)))
    .then(infoDocs => infodoc.bulkUpdate(infoDocs));
};

const updateMutingHistory = (contact, muted) => {
  const mutedParentId = isMutedInLineage(contact);

  return infodoc
    .bulkGet([{ id: mutedParentId }])
    .then(infos => {
      const reportId = infos &&
                       infos[0] &&
                       infos[0].muting_history &&
                       infos[0].muting_history.length &&
                       infos[0].muting_history[infos[0].muting_history.length - 1] &&
                       infos[0].muting_history[infos[0].muting_history.length - 1].report_id;

      return updateMutingHistories([contact], muted, reportId);
    });
};

const addMutingHistory = (info, muted, reportId) => {
  info.muting_history = info.muting_history || [];
  info.muting_history.push({
    muted: !!muted,
    date: muted || moment(),
    report_id: reportId
  });

  return info;
};

const updateMuteState = (contact, muted, reportId) => {
  muted = muted && moment();

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
          .then(() => getContactsAndSubjectIds(batch, muted))
          .then(result => Promise.all([
            updateContacts(result.contacts, muted),
            updateRegistrations(result.subjectIds, muted),
            updateMutingHistories(result.contacts, muted, reportId)
          ]));
      }, Promise.resolve());
  });
};

const isMutedInLineage = doc => {
  let parent = doc && doc.parent;
  while (parent) {
    if (parent.muted) {
      return parent._id;
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
  isMutedInLineage: isMutedInLineage,
  unmuteMessages: unmuteMessages,
  muteUnsentMessages: muteUnsentMessages,
  updateMutingHistory: updateMutingHistory,
  _getContactsAndSubjectIds: getContactsAndSubjectIds,
  _updateContacts: updateContacts,
  _updateMuteHistories: updateMutingHistories,
  _lineage: lineage
};
