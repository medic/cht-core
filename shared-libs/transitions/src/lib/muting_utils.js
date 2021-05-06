const _ = require('lodash');
const db = require('../db');
const lineage = require('@medic/lineage')(Promise, db.medic);
const utils = require('./utils');
const moment = require('moment');
const infodoc = require('@medic/infodoc');

infodoc.initLib(db.medic, db.sentinel);

const BATCH_SIZE = 50;
const OFFLINE = 'offline';
const ONLINE = 'online';

const isMutedOffline = (doc) => !!doc.muting_history && doc.muting_history.last_update === OFFLINE;

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

  if (contact.muting_history) {
    contact.muting_history.online = {
      muted: !!muted,
      date: muted || new Date().getTime(),
    };
    contact.muting_history.last_update = ONLINE;
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
      const contacts   = [];
      const subjectIds = [];

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
    .bulkGet(contacts.map(contact => ({ id: contact._id, doc: contact})))
    .then(infoDocs => infoDocs.map((info) => addMutingHistory(info, muted, reportId)))
    .then(infoDocs => infodoc.bulkUpdate(infoDocs));
};

const getLastMutingEventReportId = mutingHistory => {
  return mutingHistory &&
         mutingHistory[mutingHistory.length - 1] &&
         mutingHistory[mutingHistory.length - 1].report_id;
};

const updateMutingHistory = (contact, initialReplicationDatetime, muted) => {
  if (contact.muting_history && contact.muting_history.last_update === 'offline') {
    const reportId = contact.muting_history.offline && getLastMutingEventReportId(contact.muting_history.offline);
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
  info.muting_history.push({
    muted: !!muted,
    date: muted || moment(),
    report_id: reportId
  });

  return info;
};

/**
 *
 * @param {Object} contact - the hydrated contact document
 * @param {Boolean} muted - whether the contact should be muted or unmuted
 * @param {string} reportId - muting report uuid
 * @param {Boolean} replayOfflineMuting - whether or not offline muting needs to be replayed after processing the
 * current event
 * @return {Promise<Array>} - a sorted list of report ids, representing muting events that need to be replayed
 */
const updateMuteState = (contact, muted, reportId, replayOfflineMuting = false) => {
  muted = muted && moment();

  let rootContactId = contact._id;
  if (!muted) {
    let parent = contact;
    // get topmost muted ancestor
    while (parent) {
      rootContactId = parent.muted ? parent._id : rootContactId;
      parent = parent.parent;
    }
  }

  const offlineMutingReplayQueue = [];

  return getDescendants(rootContactId).then(contactIds => {
    const batches = [];
    while (contactIds.length) {
      batches.push(contactIds.splice(0, BATCH_SIZE));
    }

    return batches
      .reduce((promise, batch) => {
        return promise
          .then(() => getContactsAndSubjectIds(batch, muted))
          .then(result => {
            if (replayOfflineMuting) {
              offlineMutingReplayQueue.push(...getOfflineMutingEventsToReplay(result.contacts, reportId));
            }

            return Promise.all([
              updateContacts(result.contacts, muted),
              updateRegistrations(result.subjectIds, muted),
              updateMutingHistories(result.contacts, muted, reportId),
            ]);
          });
      }, Promise.resolve())
      .then(() => getSortedReplayQueue(offlineMutingReplayQueue));
  });
};

/**
 * Sorts muting events by date (these dates might be unreliable because they're generated offline) and returns list
 * of sorted report uuids.
 * @param mutingEvents
 * @return {Array<string>}
 */
const getSortedReplayQueue = (mutingEvents) => {
  const compareDates = (event1, event2) => String(event1.date).localeCompare(String(event2.date));
  const sortedReportIds = mutingEvents.sort(compareDates).map(event => event.report_id);
  // _uniq guarantees sorted results, first occurrence is selected which is what we want!
  return _.uniq(sortedReportIds);
};

/**
 * Given a list of contacts and a muting report currently being processed, searches for this report in the
 * every contacts' muting history, and compiles a list of every other muting event that followed the current event
 * in the contact's muting history.
 * @param {Array<Object>} contacts - a list of contact docs
 * @param {string} reportId - the report's uuid string
 * @return {Array<Object>}
 */
const getOfflineMutingEventsToReplay = (contacts, reportId) => {
  const offlineMutingEvents = [];
  contacts.forEach(contact => {
    if (!contact.muting_history || !contact.muting_history.offline || !contact.muting_history.offline.length) {
      return;
    }
    let found = false;
    // we reliably know that nothing shuffles this history, so every event that follows this report needs to be replayed
    contact.muting_history.offline.forEach(mutingHistory => {
      if (!mutingHistory.report_id || !mutingHistory.date) {
        return;
      }

      if (found) {
        offlineMutingEvents.push({ report_id: mutingHistory.report_id, date: mutingHistory.date });
      } else if (mutingHistory.report_id === reportId) {
        found = true;
      }
    });
  });

  return offlineMutingEvents;
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
  isMutedOffline,
  _getContactsAndSubjectIds: getContactsAndSubjectIds,
  _updateContacts: updateContacts,
  _updateMuteHistories: updateMutingHistories,
  lineage,
  db,
  infodoc,
};
