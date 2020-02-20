const config = require('../config');
const request = require('request-promise-native');
const registrationUtils = require('@medic/registration-utils');
const tombstoneUtils = require('@medic/tombstone-utils');
const serverSidePurgeUtils = require('@medic/purging-utils');
const logger = require('./logger');
const { performance } = require('perf_hooks');
const db = require('../db');
const moment = require('moment');

const TASK_EXPIRATION_PERIOD = 60; // days

const purgeDbs = {};
let currentlyPurging = false;
const getPurgeDb = (hash, refresh) => {
  if (!purgeDbs[hash] || refresh) {
    purgeDbs[hash] = db.get(serverSidePurgeUtils.getPurgeDbName(db.medicDbName, hash));
  }
  return purgeDbs[hash];
};

const initPurgeDbs = (roles) => {
  return Promise.all(Object.keys(roles).map(hash => {
    const purgeDb = getPurgeDb(hash, true);
    return purgeDb
      .put({ _id: '_local/info', roles: roles[hash] })
      .catch(err => {
        // we don't care about conflicts
        if (err.status !== 409) {
          throw err;
        }
      });
  }));
};

const closePurgeDbs = () => {
  Object.keys(purgeDbs).forEach(hash => {
    db.close(purgeDbs[hash]);
    delete purgeDbs[hash];
  });
};

const BATCH_SIZE = 1000;

const getRoles = () => {
  const list = {};
  const roles = {};

  return db.users
    .allDocs({ include_docs: true })
    .then(result => {
      result.rows.forEach(row => {
        if (!row.doc ||
            !row.doc.roles ||
            !Array.isArray(row.doc.roles) ||
            !row.doc.roles.length ||
            !serverSidePurgeUtils.isOffline(config.get('roles'), row.doc.roles)
        ) {
          return;
        }

        const rolesString = serverSidePurgeUtils.sortedUniqueRoles(row.doc.roles);
        list[JSON.stringify(rolesString)] = rolesString;
      });

      Object.values(list).forEach(list => {
        const hash = serverSidePurgeUtils.getRoleHash(list);
        roles[hash] = list;
      });

      return roles;
    });
};

// provided a list of roles hashes and doc ids, will return the list of existent purged docs per role hash:
// {
//   hash1: {
//     id1: rev_of_id_1,
//     id2: rev_of_id_2,
//     id3: rev_of_id_3,
//   },
//   hash2: {
//     id3: rev_of_id_3,
//     id5: rev_of_id_5,
//     id6: rev_of_id_6,
//   }
// }

const getAlreadyPurgedDocs = (roleHashes, ids) => {
  const purged = {};
  roleHashes.forEach(hash => purged[hash] = {});

  if (!ids || !ids.length) {
    return Promise.resolve(purged);
  }

  const purgeIds = ids.map(id => serverSidePurgeUtils.getPurgedId(id));
  const changesOpts = {
    doc_ids: purgeIds,
    batch_size: purgeIds.length + 1,
    seq_interval: purgeIds.length
  };

  // requesting _changes instead of _all_docs because it's roughly twice faster
  return Promise
    .all(roleHashes.map(hash => getPurgeDb(hash).changes(changesOpts)))
    .then(results => {
      results.forEach((result, idx) => {
        const hash = roleHashes[idx];
        result.results.forEach(change => {
          if (!change.deleted) {
            purged[hash][serverSidePurgeUtils.extractId(change.id)] = change.changes[0].rev;
          }
        });
      });

      return purged;
    });
};

const getPurgeFn = () => {
  const purgeConfig = config.get('purge');
  if (!purgeConfig || !purgeConfig.fn) {
    return;
  }

  let purgeFn;
  try {
    purgeFn = eval(`(${purgeConfig.fn})`);
  } catch (err) {
    logger.error('Failed to parse purge function: %o', err);
    return;
  }

  if (typeof purgeFn !== 'function') {
    logger.error('Configured purge function is not a function');
    return;
  }

  return purgeFn;
};

const updatePurgedDocs = (rolesHashes, ids, alreadyPurged, toPurge) => {
  const docs = {};

  ids.forEach(id => {
    rolesHashes.forEach(hash => {
      docs[hash] = docs[hash] || [];

      const isPurged = alreadyPurged[hash][id];
      const shouldPurge = toPurge[hash][id];

      // do nothing if purge state is unchanged
      if (!!isPurged === !!shouldPurge) {
        return;
      }

      if (isPurged) {
        docs[hash].push({ _id: serverSidePurgeUtils.getPurgedId(id), _rev: isPurged, _deleted: true });
      } else {
        docs[hash].push({ _id: serverSidePurgeUtils.getPurgedId(id) });
      }
    });
  });

  return Promise.all(rolesHashes.map(hash => {
    if (!docs[hash] || !docs[hash].length) {
      return Promise.resolve([]);
    }
    return getPurgeDb(hash).bulkDocs({ docs: docs[hash] });
  }));
};

const validPurgeResults = (result) => result && Array.isArray(result);

const assignContactToGroups = (row, groups, subjectIds) => {
  const group = {
    reports: [],
    messages: [],
    ids: []
  };
  let key;
  const contact = row.doc;
  if (tombstoneUtils.isTombstoneId(row.id)) {
    // we keep tombstones here just as a means to group reports and messages from deleted contacts, but
    // finally not provide the actual contact in the purge function. we will also not "purge" tombstones.
    key =  tombstoneUtils.extractStub(row.id).id;
    group.contact = { _deleted: true };
    group.subjectIds = registrationUtils.getSubjectIds(row.doc.tombstone);
  } else {
    key = row.id;
    group.contact = row.doc;
    group.subjectIds = registrationUtils.getSubjectIds(contact);
    group.ids.push(row.id);
  }

  groups[key] = group;
  subjectIds.push(...group.subjectIds);
};

const getRecordGroupInfo = (row, groups, subjectIds) => {
  if (groups[row.id]) { // groups keys are contact ids, we already know everything about contacts
    return;
  }

  if (tombstoneUtils.isTombstoneId(row.id)) { // we don't purge tombstones
    return;
  }

  if (row.doc.form) {
    const subjectId = registrationUtils.getSubjectId(row.doc);
    if (row.doc.needs_signoff) {
      // reports with needs_signoff will emit for every contact from their submitter lineage,
      // but we only want to process them once, either associated to their patient or alone, if no patient_id

      if (subjectId && !subjectIds.includes(subjectId)) {
        // if the report has a subject, but it is not amongst the list of keys we requested, we hit the emit
        // for the contact or it's lineage via the `needs_signoff` path. Skip.
        return;
      }
      const submitter = row.doc.contact && row.doc.contact._id;
      if (!subjectId && !subjectIds.includes(submitter)) {
        // if the report doesn't have a subject, we want to process it when we hit the emit for the submitter.
        // if the report submitter is not amongst our request keys, we hit an emit for the submitter's lineage. Skip.
        return;
      }
    }

    // use patient_id as a key, as to keep subject to report associations correct
    // reports without a subject are processed separately
    const key = subjectId === row.key ? subjectId : row.id;
    return { key, report: row.doc };
  } else {
    // messages only emit once, either their sender or receiver
    return { key: row.key, message: row.doc };
  }
};

const getRecordsByKey = (rows, groups, subjectIds) => {
  const recordsByKey = {};
  rows.forEach(row => {
    const groupInfo = getRecordGroupInfo(row, groups, subjectIds);
    if (!groupInfo) {
      return;
    }
    const { key, report, message } = groupInfo;
    recordsByKey[key] = recordsByKey[key] || { reports: [], messages: [] };

    return report ?
      recordsByKey[key].reports.push(report) :
      recordsByKey[key].messages.push(message);
  });
  return recordsByKey;
};

const assignRecordsToGroups = (recordsByKey, groups) => {
  Object.keys(recordsByKey).forEach(key => {
    const records = recordsByKey[key];
    const group = Object.values(groups).find(group => group.subjectIds.includes(key));
    if (!group) {
      // reports that have no subject are processed separately
      records.reports.forEach(report => {
        groups[report._id] = { contact: {}, reports: [report], messages: [], ids: [], subjectIds: [] };
      });
      return;
    }

    group.reports.push(...records.reports);
    group.messages.push(...records.messages);
  });
};

const getIdsFromGroups = (groups) => {
  const ids = [];
  Object.values(groups).forEach(group => {
    group.ids.push(...group.messages.map(message => message._id));
    group.ids.push(...group.reports.map(message => message._id));
    ids.push(...group.ids);
  });
  return ids;
};

const getDocsToPurge = (purgeFn, groups, roles) => {
  const rolesHashes = Object.keys(roles);
  const toPurge = {};

  Object.values(groups).forEach(group => {
    rolesHashes.forEach(hash => {
      toPurge[hash] = toPurge[hash] || {};
      if (!group.ids.length) {
        return;
      }

      const idsToPurge = purgeFn({ roles: roles[hash] }, group.contact, group.reports, group.messages);
      if (!validPurgeResults(idsToPurge)) {
        return;
      }

      idsToPurge.forEach(id => {
        toPurge[hash][id] = group.ids.includes(id);
      });
    });
  });

  return toPurge;
};

const batchedContactsPurge = (roles, purgeFn, startKey = '', startKeyDocId = '') => {
  let nextKeyDocId;
  let nextKey;
  const groups = {};
  const subjectIds = [];
  const rolesHashes = Object.keys(roles);
  let docIds;

  logger.debug(`Starting contacts purge batch starting with key ${startKey} with id ${startKeyDocId}`);

  const queryString = {
    limit: BATCH_SIZE,
    start_key: JSON.stringify(startKey),
    startkey_docid: startKeyDocId,
    include_docs: true,
  };

  // using `request` library because PouchDB doesn't support `startkey_docid` in view queries
  // using `startkey_docid` because using `skip` is *very* slow
  return request
    .get(`${db.couchUrl}/_design/medic-client/_view/contacts_by_type`, { qs: queryString, json: true })
    .then(result => {
      result.rows.forEach(row => {
        if (row.id === startKeyDocId) {
          return;
        }
        ({ id: nextKeyDocId, key: nextKey } = row);
        assignContactToGroups(row, groups, subjectIds);
      });

      return db.medic.query('medic/docs_by_replication_key', { keys: subjectIds, include_docs: true });
    })
    .then(result => {
      const recordsByKey = getRecordsByKey(result.rows, groups, subjectIds);
      assignRecordsToGroups(recordsByKey, groups);
      docIds = getIdsFromGroups(groups);

      return getAlreadyPurgedDocs(rolesHashes, docIds);
    })
    .then(alreadyPurged => {
      const toPurge = getDocsToPurge(purgeFn, groups, roles);
      return updatePurgedDocs(rolesHashes, docIds, alreadyPurged, toPurge);
    })
    .then(() => nextKey && batchedContactsPurge(roles, purgeFn, nextKey, nextKeyDocId));
};

const batchedUnallocatedPurge = (roles, purgeFn, startKeyDocId = '') => {
  let nextKeyDocId;
  const docs = [];
  const docIds = [];
  const rolesHashes = Object.keys(roles);

  logger.debug(`Starting unallocated purge batch with id ${startKeyDocId}`);

  const queryString = {
    limit: BATCH_SIZE,
    key: JSON.stringify('_unassigned'),
    startkey_docid: startKeyDocId,
    include_docs: true
  };

  return request
    .get(`${db.couchUrl}/_design/medic/_view/docs_by_replication_key`, { qs: queryString, json: true })
    .then(result => {
      result.rows.forEach(row => {
        if (row.id === startKeyDocId) {
          return;
        }

        nextKeyDocId = row.id;
        docIds.push(row.id);
        docs.push(row.doc);
      });

      return getAlreadyPurgedDocs(rolesHashes, docIds);
    })
    .then(alreadyPurged => {
      const toPurge = {};
      docs.forEach(doc => {
        rolesHashes.forEach(hash => {
          toPurge[hash] = toPurge[hash] || {};
          const purgeIds = doc.form ?
            purgeFn({ roles: roles[hash] }, {}, [doc], []) :
            purgeFn({ roles: roles[hash] }, {}, [], [doc]);

          if (!validPurgeResults(purgeIds)) {
            return;
          }
          toPurge[hash][doc._id] = purgeIds.includes(doc._id);
        });
      });

      return updatePurgedDocs(rolesHashes, docIds, alreadyPurged, toPurge);
    })
    .then(() => nextKeyDocId && batchedUnallocatedPurge(roles, purgeFn, nextKeyDocId));
};

const batchedTasksPurge = (roles, startKeyDocId = '') => {
  let nextKeyDocId;
  const rows = [];
  const docIds = [];
  const rolesHashes = Object.keys(roles);
  const now = moment();

  logger.debug(`Starting tasks purge batch with id ${startKeyDocId}`);

  const terminalStates = ['Cancelled', 'Completed', 'Failed'];

  const queryString = {
    limit: BATCH_SIZE,
    keys: JSON.stringify(terminalStates),
    startkey_docid: startKeyDocId,
  };

  return request
    .get(`${db.couchUrl}/_design/medic/_view/targets_by_state`, { qs: queryString, json: true })
    .then(result => {
      result.rows.forEach(row => {
        if (row.id === startKeyDocId) {
          return;
        }

        nextKeyDocId = row.id;
        docIds.push(row.id);
        rows.push(row);
      });

      return getAlreadyPurgedDocs(rolesHashes, docIds);
    })
    .then(alreadyPurged => {
      const toPurge = {};
      rows.forEach(row => {
        rolesHashes.forEach(hash => {
          toPurge[hash] = toPurge[hash] || {};
          const daysSinceTaskEndDate = now.diff(row.value.endDate, 'days');
          if (daysSinceTaskEndDate >= TASK_EXPIRATION_PERIOD) {
            toPurge[hash][row.id] = row.id;
          }
        });
      });

      return updatePurgedDocs(rolesHashes, docIds, alreadyPurged, toPurge);
    })
    .then(() => nextKeyDocId && batchedTasksPurge(roles, nextKeyDocId));
};


const writePurgeLog = (roles, duration) => {
  const date = new Date();
  return db.sentinel.put({
    _id: `purgelog:${date.valueOf()}`,
    date: date.toISOString(),
    roles: roles,
    duration: duration
  });
};

// purges documents that would be replicated by offline users
// - reads all user documents from the `_users` database to comprise a list of unique sets of roles
// - creates a database for each role set with the name `<main db name>-purged-role-<hash>` where `hash` is an md5 of
// the JSON.Stringify-ed list of roles
// - iterates over all contacts by querying `medic-client/contacts_by_type` in batches
// - for every batch of contacts, queries `docs_by_replication_key` with the resulting `subject_ids`
// - groups results by contact to generate a list of pairs containing :
//    a) a contact document
//    b) a list of reports which are about the contact (*not submitted by the contact*)
//    c) a list of free form sms messages that the contact has sent or received
// - every group is passed to the purge function for every unique role set
// - the purge function returns a list of docs ids that should be purged
// - for every group, we check which of the documents are currently purged
// (by requesting _changes from the target purge database, using the list of corresponding ids)
// - queries `docs_by_replication_key` with `_unassigned` key and runs purge over every unallocated doc, individually
// - after running purge in every case, we compare the list of ids_to_purge with the ids_already_purged and:
//     a) docs that are already purged and should stay purged, we do nothing
//     b) docs that are already purged and should not be purged, we remove from purged db
//     c) docs that are not purged and should be purged, we add to the purged db
// - we intentionally skip purging "orphaned" docs (docs that emit in `docs_by_replication_key` but that are not
// retrieved when systematically querying the view with all existent subjects), as these docs would not end up being
// replicated
// - we intentionally skip reports that `needs_signoff` when they are retrieved because of the `needs_signoff`
// submitter lineage emit. As a consequence, orphaned reports with `needs_signoff` will not be purged

const purge = () => {
  if (currentlyPurging) {
    return;
  }
  logger.info('Running server side purge');
  const purgeFn = getPurgeFn();
  if (!purgeFn) {
    logger.info('No purge function configured.');
    return Promise.resolve();
  }

  currentlyPurging = true;
  const start = performance.now();
  return getRoles()
    .then(roles => {
      if (!roles || !Object.keys(roles).length) {
        logger.info(`No offline users found. Not purging.`);
        return;
      }
      return initPurgeDbs(roles)
        .then(() => batchedContactsPurge(roles, purgeFn))
        .then(() => batchedUnallocatedPurge(roles, purgeFn))
        .then(() => batchedTasksPurge(roles))
        .then(() => {
          const duration = (performance.now() - start);
          logger.info(`Server Side Purge completed successfully in ${duration / 1000 / 60} minutes`);
          return writePurgeLog(roles, duration);
        });
    })
    .catch(err => {
      logger.error('Error while running Server Side Purge: %o', err);
    })
    .then(() => {
      currentlyPurging = false;
      closePurgeDbs();
    });
};

module.exports = {
  purge,
};
