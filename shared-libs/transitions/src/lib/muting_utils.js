const _ = require('lodash');
const db = require('../db');
const lineage = require('@medic/lineage')(Promise, db.medic);
const utils = require('./utils');
const moment = require('moment');
const infodoc = require('@medic/infodoc');

infodoc.initLib(db.medic, db.sentinel);

const BATCH_SIZE = 50;
const CLIENT = 'client_side';
const SERVER = 'server_side';

const isLastUpdatedByClient = (doc) => !!doc.muting_history && doc.muting_history.last_update === CLIENT;

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

  const updatedContacts = contacts.filter(contact => updateContact(contact, muted));
  if (!updatedContacts.length) {
    return Promise.resolve();
  }

  return db.medic.bulkDocs(updatedContacts);
};

/**
 * Updates the muted state on a given contact, updates local muting history, if it exists.
 * If a contact does not need updating, the object is not mutated and the function returns boolean false.
 * The contact does not need updating when either:
 * a) an already muted contact is muted and there is no muting history
 * b) an already unmuted contact is unmuted and there is no muting history
 * c) an already muted contact is muted, and the muting history is up to date
 * d) an already unmuted contact is unmuted, and the muting history is up to date
 * Muting history is up to date when:
 * - the last update was made on the server
 * - the server muted state corresponds with the updated muted state.
 * In any other case, the contact will be updated with the new muted state.
 * @param {Object} contact
 * @param {string|boolean} muted
 * @return {boolean}
 */
const updateContact = (contact, muted) => {
  const isMutingHistoryUpToDate = !contact.muting_history ||
                                  (
                                    contact.muting_history &&
                                    contact.muting_history.last_update === SERVER &&
                                    contact.muting_history[SERVER].muted === !!muted
                                  );

  let updated = false;
  let mutedTimestamp;
  if (muted) {
    if (isMutingHistoryUpToDate) {
      // if muting an already muted contact and muting history requires no changes, use the contact's muted timestamp
      mutedTimestamp = contact.muted || muted;
    } else {
      // if muting an already muted contact and muting history requires changes, use the new muted timestamp
      mutedTimestamp = muted;
    }
  }

  if (!isMutingHistoryUpToDate && contact.muting_history) {
    updated = true;
    contact.muting_history[SERVER] = {
      muted: !!muted,
      date: mutedTimestamp || moment().toISOString(),
    };
    contact.muting_history.last_update = SERVER;
  }

  if (!isMutingHistoryUpToDate || contact.muted !== mutedTimestamp) {
    updated = true;
    if (muted) {
      contact.muted = mutedTimestamp;
    } else {
      delete contact.muted;
    }
  }

  return updated;
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

const getContactsAndSubjectIds = (contactIds) => {
  return db.medic
    .allDocs({ keys: contactIds, include_docs: true })
    .then(result => {
      const contacts   = [];
      const subjectIds = [];

      result.rows.forEach(row => {
        if (!row.doc) {
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
    .bulkGet(contacts.map(contact => ({ id: contact._id, doc: contact})))
    .then(infoDocs => {
      const updatedInfoDocs = infoDocs.filter((info) => addMutingHistory(info, muted, reportId));
      if (!updatedInfoDocs.length) {
        return Promise.resolve();
      }

      return infodoc.bulkUpdate(updatedInfoDocs);
    });
};

const getLastMutingEventReportId = mutingHistory => {
  return mutingHistory &&
         mutingHistory[mutingHistory.length - 1] &&
         mutingHistory[mutingHistory.length - 1].report_id;
};

const updateMutingHistory = (contact, initialReplicationDatetime, muted) => {
  if (isLastUpdatedByClient(contact)) {
    // when last updated on the client, pick the last client-side muting event report uuid to store in infodoc history
    const reportId = contact.muting_history[CLIENT] && getLastMutingEventReportId(contact.muting_history[CLIENT]);
    return updateMutingHistories([contact], muted, reportId);
  }

  const mutedParentId = isMutedInLineage(contact, initialReplicationDatetime);

  return infodoc
    .get({ id: mutedParentId })
    .then(infoDoc => {
      const reportId = infoDoc && getLastMutingEventReportId(infoDoc.muting_history);
      return updateMutingHistories([contact], muted, reportId);
    });
};

const addMutingHistory = (info, muted, reportId) => {
  info.muting_history = info.muting_history || [];

  // we could be replaying offline muting history. don't duplicate last entry of muting history.
  const lastEntry = info.muting_history.length && info.muting_history[info.muting_history.length - 1];
  if (lastEntry && (lastEntry.muted === !!muted && lastEntry.report_id === reportId)) {
    return;
  }

  info.muting_history.push({
    muted: !!muted,
    date: muted || moment().toISOString(),
    report_id: reportId
  });

  return info;
};

/**
 *
 * @param {Object} contact - the hydrated contact document
 * @param {Boolean} muted - whether the contact should be muted or unmuted
 * @param {string} reportId - muting report uuid
 * @param {Boolean} replayClientMuting - whether or not client-side muting needs to be replayed after processing the
 * current event
 * @return {Promise<Array>} - a sorted list of report ids, representing muting events that need to be replayed
 */
const updateMuteState = (contact, muted, reportId, replayClientMuting = false) => {
  muted = muted && moment().toISOString();

  let rootContactId = contact._id;
  if (!muted) {
    let parent = contact;
    // get topmost muted ancestor
    while (parent) {
      rootContactId = parent.muted ? parent._id : rootContactId;
      parent = parent.parent;
    }
  }

  const clientMutingEventQueue = [];

  return getDescendants(rootContactId).then(contactIds => {
    const batches = [];
    while (contactIds.length) {
      batches.push(contactIds.splice(0, BATCH_SIZE));
    }

    return batches
      .reduce((promise, batch) => {
        return promise
          .then(() => getContactsAndSubjectIds(batch))
          .then(result => {
            if (replayClientMuting) {
              clientMutingEventQueue.push(...getClientMutingEventsToReplay(result.contacts, reportId));
            }

            return Promise.all([
              updateContacts(result.contacts, muted),
              updateRegistrations(result.subjectIds, muted),
              updateMutingHistories(result.contacts, muted, reportId),
            ]);
          });
      }, Promise.resolve())
      .then(() => getSortedEventQueue(clientMutingEventQueue));
  });
};

/**
 * Sorts muting events by date (these dates might be unreliable, coming from users' devices) and returns the list
 * of sorted report uuids. Dates are strings in ISO format.
 * @param mutingEvents
 * @return {Array<string>}
 */
const getSortedEventQueue = (mutingEvents) => {
  const compareDates = (event1, event2) => String(event1.date).localeCompare(String(event2.date));
  const sortedReportIds = mutingEvents.sort(compareDates).map(event => event.report_id);
  // _uniq guarantees sorted results, first occurrence is selected which is what we want!
  return _.uniq(sortedReportIds);
};

/**
 * Given a list of contacts and a muting report uuid, searches for this uuid in every contacts' client muting history,
 * and compiles a list of every muting event that followed the matched event in the contact's muting history.
 * We reliably know that nothing shuffles the muting_history, so every event that follows the matched event needs to be
 * replayed.
 * @param {Array<Object>} contacts - a list of contact docs
 * @param {string} reportId - the report's uuid
 * @return {Array<Object>}
 */
const getClientMutingEventsToReplay = (contacts, reportId) => {
  const clientMutingEvents = [];
  contacts.forEach(contact => {
    if (!contact.muting_history || !contact.muting_history[CLIENT] || !contact.muting_history[CLIENT].length) {
      return;
    }

    let found = false;
    contact.muting_history[CLIENT].forEach(mutingEvent => {
      if (!mutingEvent.report_id || !mutingEvent.date) {
        return;
      }

      if (found) {
        clientMutingEvents.push(mutingEvent);
      } else if (mutingEvent.report_id === reportId) {
        found = true;
      }
    });
  });

  return clientMutingEvents;
};

const isMutedInLineage = (doc, beforeMillis) => {
  let parent = doc && doc.parent;
  while (parent) {
    if (parent.muted && (beforeMillis ? new Date(parent.muted).getTime() <= beforeMillis : true)) {
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
  updateMuteState,
  updateContact,
  updateRegistrations,
  isMutedInLineage,
  unmuteMessages,
  muteUnsentMessages,
  updateMutingHistory,
  isLastUpdatedByClient,
  _getContactsAndSubjectIds: getContactsAndSubjectIds,
  _updateContacts: updateContacts,
  _updateMuteHistories: updateMutingHistories,
  lineage,
  db,
  infodoc,
};
