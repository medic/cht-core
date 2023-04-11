const config = require('../config');
const registrationUtils = require('@medic/registration-utils');
const tombstoneUtils = require('@medic/tombstone-utils');
const serverSidePurgeUtils = require('@medic/purging-utils');
const chtScriptApi = require('@medic/cht-script-api');
const logger = require('./logger');
const { performance } = require('perf_hooks');
const db = require('../db');
const moment = require('moment');

const TASK_EXPIRATION_PERIOD = 60; // days
const TARGET_EXPIRATION_PERIOD = 6; // months

const MAX_CONTACT_BATCH_SIZE = 1000;
const VIEW_LIMIT = 100 * 1000;
const MAX_BATCH_SIZE = 20 * 1000;
const MIN_BATCH_SIZE = 5 * 1000;
const MAX_BATCH_SIZE_REACHED = 'max_size_reached';
let contactsBatchSize = MAX_CONTACT_BATCH_SIZE;
let skippedContacts = [];

const decreaseBatchSize = () => {
  contactsBatchSize = Math.floor(contactsBatchSize / 2);
};

const increaseBatchSize = () => {
  contactsBatchSize = Math.min(MAX_CONTACT_BATCH_SIZE, contactsBatchSize * 2);
};

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

const isRelevantRecordEmission = (row, groups) => {
  if (groups[row.id]) { // groups keys are contact ids, we already know everything about contacts
    return false;
  }

  if (tombstoneUtils.isTombstoneId(row.id)) { // we don't purge tombstones
    return false;
  }

  if (row.value.type !== 'data_record') {
    return false;
  }

  if (row.value.needs_signoff && row.key !== row.value.subject) {
    // reports with `needs_signoff` will emit for every contact from their submitter lineage,
    // but we only want to process them once, either associated to their subject, or to their submitter
    // when they have no subject or have an invalid subject.
    // if the report has a subject, but it's not the the same as the emission key, we hit the emit
    // for the submitter or submitter lineage via the `needs_signoff` path. Skip.
    return false;
  }

  return true;
};

const getRecordGroupInfo = (row) => {
  if (row.doc.form) {
    const subjectId = registrationUtils.getSubjectId(row.doc);
    // use subject as a key, as to keep subject to report associations correct
    // reports without a subject are processed separately
    const key = subjectId === row.key ? subjectId : row.id;
    return { key, report: row.doc };
  }

  // messages only emit once, either their sender or receiver
  return { key: row.key, message: row.doc };
};

const hydrateRecords = async (recordRows) => {
  const recordIds = recordRows.map(row => row.id);

  const allDocsResult = await db.medic.allDocs({ keys: recordIds, include_docs: true });
  recordRows.forEach((row, idx) => row.doc = allDocsResult.rows[idx].doc);
  return recordRows.filter(row => row.doc);
};

const getRecordsForContacts = async (groups, subjectIds) => {
  if (!subjectIds.length) {
    return;
  }

  const relevantRows = [];
  let skip = 0;
  let requestNext;

  do {
    const opts = {
      keys: subjectIds,
      limit: VIEW_LIMIT,
      skip: skip,
    };
    const result = await db.medic.query('medic/docs_by_replication_key', opts);

    skip += result.rows.length;
    requestNext = result.rows.length === VIEW_LIMIT;

    relevantRows.push(...result.rows.filter(row => isRelevantRecordEmission(row, groups)));
    if (relevantRows.length >= MAX_BATCH_SIZE) {
      return Promise.reject({
        code: MAX_BATCH_SIZE_REACHED,
        contactIds: Object.keys(groups),
        message: `Purging skipped. Too many records for contacts: ${Object.keys(groups).join(', ')}`,
      });
    }
  } while (requestNext);

  if (relevantRows.length < MIN_BATCH_SIZE) {
    increaseBatchSize();
  }

  logger.info(`Found ${relevantRows.length} records`);
  if (!relevantRows.length) {
    return;
  }

  const hydratedRows = await hydrateRecords(relevantRows);
  const recordsByKey = getRecordsByKey(hydratedRows);
  assignRecordsToGroups(recordsByKey, groups);
};

const getRecordsByKey = (rows) => {
  const recordsByKey = {};
  rows.forEach(row => {
    const { key, report, message } = getRecordGroupInfo(row);
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

      const permissionSettings = config.get('permissions');

      const idsToPurge = purgeFn(
        { roles: roles[hash] },
        group.contact,
        group.reports,
        group.messages,
        chtScriptApi,
        permissionSettings
      );
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

const purgeContacts = async (roles, purgeFn) => {
  let startKey = '';
  let startKeyDocId = '';
  let nextBatch = true;

  do {
    const result = await batchedContactsPurge(roles, purgeFn, startKey, startKeyDocId);
    ({ nextKey: startKey, nextKeyDocId: startKeyDocId, nextBatch } = result);
  } while (nextBatch);
};

const batchedContactsPurge = (roles, purgeFn, startKey = '', startKeyDocId = '') => {
  let nextKeyDocId;
  let nextKey;
  let nextBatch = false;
  const groups = {};
  const subjectIds = [];
  const rolesHashes = Object.keys(roles);
  let docIds;

  logger.info(
    `Purging: Starting contacts batch: key "${startKey}", doc id "${startKeyDocId}", batch size ${contactsBatchSize}`
  );

  // every request with `startKeyDocId` will include the startKeyDocId document as the 1st result.
  // this document was already processed and it's skipped. when batch size goes down to 1 and we have a start doc id,
  // it's required that we increase the limit to at least 2, in order to get one new contact to process.
  const limit = startKeyDocId !== '' ? contactsBatchSize + 1 : contactsBatchSize;
  const queryString = {
    limit: limit,
    start_key: JSON.stringify(startKey),
    startkey_docid: startKeyDocId,
    include_docs: true,
  };

  // using `db.queryMedic` library because PouchDB doesn't support `startkey_docid` in view queries
  // using `startkey_docid` because using `skip` is *very* slow
  return db
    .queryMedic('medic-client/contacts_by_type', queryString)
    .then(result => {
      result.rows.forEach(row => {
        if (row.id === startKeyDocId) {
          return;
        }
        nextBatch = true;
        ({ id: nextKeyDocId, key: nextKey } = row);
        assignContactToGroups(row, groups, subjectIds);
      });
    })
    .then(() => getRecordsForContacts(groups, subjectIds))
    .then(() => {
      docIds = getIdsFromGroups(groups);
      return getAlreadyPurgedDocs(rolesHashes, docIds);
    })
    .then(alreadyPurged => {
      const toPurge = getDocsToPurge(purgeFn, groups, roles);
      return updatePurgedDocs(rolesHashes, docIds, alreadyPurged, toPurge);
    })
    .then(() => ({ nextKey, nextKeyDocId, nextBatch }))
    .catch(err => {
      if (err && err.code === MAX_BATCH_SIZE_REACHED) {
        if (contactsBatchSize > 1) {
          decreaseBatchSize();
          logger.warn(`Purging: Too many reports to purge. Decreasing contacts batch size to ${contactsBatchSize}`);
          return { nextKey: startKey, nextKeyDocId: startKeyDocId, nextBatch };
        }

        logger.warn(`Purging: Too many reports to purge. Skipping contacts ${err.contactIds.join(', ')}.`);
        skippedContacts.push(...err.contactIds);
        return { nextKey, nextKeyDocId, nextBatch };
      }

      throw err;
    });
};

const purgeUnallocatedRecords = async (roles, purgeFn) => {
  let startKeyDocId = '';
  let startKey = '';
  let nextBatch;

  // using `db.queryMedic` because PouchDB doesn't support `start_key_doc_id`
  const getBatch = () => db.queryMedic('medic/docs_by_replication_key', {
    limit: MAX_BATCH_SIZE,
    key: JSON.stringify('_unassigned'),
    startkey_docid: startKeyDocId,
    include_docs: true
  });
  const permissionSettings = config.get('permissions');

  const getIdsToPurge = (rolesHashes, rows) => {
    const toPurge = {};
    rows.forEach(row => {
      const doc = row.doc;
      rolesHashes.forEach(hash => {
        toPurge[hash] = toPurge[hash] || {};
        const purgeIds = doc.form ?
          purgeFn({ roles: roles[hash] }, {}, [doc], [], chtScriptApi, permissionSettings) :
          purgeFn({ roles: roles[hash] }, {}, [], [doc], chtScriptApi, permissionSettings);

        if (!validPurgeResults(purgeIds)) {
          return;
        }
        toPurge[hash][doc._id] = purgeIds.includes(doc._id);
      });
    });

    return toPurge;
  };

  do {
    logger.info(`Purging: Starting "unallocated reports" purge batch with id "${startKeyDocId}"`);
    const result = await batchedPurge(getBatch, getIdsToPurge, roles, startKeyDocId, startKey);
    ({ nextKey: startKey, nextKeyDocId: startKeyDocId, nextBatch } = result);
  } while (nextBatch);
};

const purgeTasks = async (roles) => {
  const maximumEmissionEndDate = moment().subtract(TASK_EXPIRATION_PERIOD, 'days').format('YYYY-MM-DD');
  let startKeyDocId = '';
  let startKey = '';
  let nextBatch;

  // using `db.queryMedic` because PouchDB doesn't support `start_key_doc_id`
  const getBatch = () => db.queryMedic('medic/tasks_in_terminal_state', {
    limit: MAX_BATCH_SIZE,
    end_key: JSON.stringify(maximumEmissionEndDate),
    start_key: JSON.stringify(startKey),
    startkey_docid: startKeyDocId,
  });

  const getIdsToPurge = (rolesHashes, rows) => {
    const toPurge = {};
    rows.forEach(row => {
      rolesHashes.forEach(hash => {
        toPurge[hash] = toPurge[hash] || {};
        toPurge[hash][row.id] = row.id;
      });
    });
    return toPurge;
  };

  do {
    logger.info(`Purging: Starting "tasks" purge batch with id "${startKeyDocId}"`);
    const result = await batchedPurge(getBatch, getIdsToPurge, roles, startKeyDocId, startKey);
    ({ nextKey: startKey, nextKeyDocId: startKeyDocId, nextBatch } = result);
  } while (nextBatch);
};

const purgeTargets = async (roles) => {
  let startKeyDocId = 'target~';
  let startKey = JSON.stringify(startKeyDocId);
  let nextBatch;

  const lastAllowedReportingIntervalTag = moment().subtract(TARGET_EXPIRATION_PERIOD, 'months').format('YYYY-MM');
  // using `db.queryMedic` because PouchDB doesn't support `start_key_doc_id`
  const getBatch = () => db.queryMedic('allDocs', {
    limit: MAX_BATCH_SIZE,
    start_key: JSON.stringify(startKeyDocId),
    end_key: JSON.stringify(`target~${lastAllowedReportingIntervalTag}~`),
  });

  const getIdsToPurge = (rolesHashes, rows) => {
    const toPurge = {};
    rows.forEach(row => {
      rolesHashes.forEach(hash => {
        toPurge[hash] = toPurge[hash] || {};
        toPurge[hash][row.id] = row.id;
      });
    });
    return toPurge;
  };

  do {
    logger.info(`Purging: Starting "targets" purge batch with id "${startKeyDocId}"`);
    const result = await batchedPurge(getBatch, getIdsToPurge, roles, startKeyDocId, startKey);
    ({ nextKey: startKey, nextKeyDocId: startKeyDocId, nextBatch } = result);
  } while (nextBatch);
};

const batchedPurge = (getBatch, getIdsToPurge, roles, startKeyDocId) => {
  let nextKey = false;
  let nextKeyDocId = false;
  let nextBatch = false;
  const rows = [];
  const docIds = [];
  const rolesHashes = Object.keys(roles);

  return getBatch()
    .then(result => {
      result.rows.forEach(row => {
        if (row.id === startKeyDocId) {
          return;
        }

        ({ id: nextKeyDocId, key: nextKey } = row);
        nextBatch = true;
        docIds.push(row.id);
        rows.push(row);
      });

      return getAlreadyPurgedDocs(rolesHashes, docIds);
    })
    .then(alreadyPurged => {
      const toPurge = getIdsToPurge(rolesHashes, rows);
      return updatePurgedDocs(rolesHashes, docIds, alreadyPurged, toPurge);
    })
    .then(() => ({ nextKey, nextKeyDocId, nextBatch }));
};

const writePurgeLog = (roles, start, error) => {
  const duration = (performance.now() - start);
  logger.info(`Purging ${error ? 'failed after' : 'completed in'} ${duration / 1000 / 60} minutes`);
  const date = moment();
  const id = `purgelog${error ? ':error' : ''}:${date.valueOf()}`;

  return db.sentinel.put({
    _id: id,
    date: date.toISOString(),
    roles: roles,
    duration: duration,
    skipped_contacts: skippedContacts,
    error: error && JSON.stringify(error),
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
  logger.info('Running purging');
  const purgeFn = getPurgeFn();
  if (!purgeFn) {
    logger.info('Purging: No purge function configured.');
    return Promise.resolve();
  }

  contactsBatchSize = MAX_CONTACT_BATCH_SIZE;
  currentlyPurging = true;
  skippedContacts = [];

  let roles;

  const start = performance.now();

  return getRoles()
    .then(userRoles => {
      roles = userRoles;

      if (!roles || !Object.keys(roles).length) {
        logger.info(`Purging: No offline users found. Purging is skipped.`);
        return;
      }
      return initPurgeDbs(roles)
        .then(() => purgeContacts(roles, purgeFn))
        .then(() => purgeUnallocatedRecords(roles, purgeFn))
        .then(() => purgeTasks(roles))
        .then(() => purgeTargets(roles))
        .then(() => writePurgeLog(roles, start));
    })
    .catch(err => {
      logger.error('Error while running purging: %o', err);
      return writePurgeLog(roles, start, err);
    })
    .then(() => {
      currentlyPurging = false;
      closePurgeDbs();
    });
};

module.exports = {
  purge,
};
