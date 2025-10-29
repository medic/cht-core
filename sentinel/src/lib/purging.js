const config = require('../config');
const registrationUtils = require('@medic/registration-utils');
const serverSidePurgeUtils = require('@medic/purging-utils');
const cht = require('@medic/cht-datasource');
const logger = require('@medic/logger');
const environment = require('@medic/environment');
const { performance } = require('perf_hooks');
const db = require('../db');
const dataContext = require('../data-context');
const request = require('@medic/couch-request');
const nouveau = require('@medic/nouveau');
const moment = require('moment');

const TASK_EXPIRATION_PERIOD = 60; // days
const TARGET_EXPIRATION_PERIOD = 6; // months

const MAX_CONTACT_BATCH_SIZE = nouveau.BATCH_LIMIT;
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
    purgeDbs[hash] = db.get(serverSidePurgeUtils.getPurgeDbName(environment.db, hash));
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
//     id1: rev1,
//     id2: rev2,
//     id2: rev2,
//   },
//   hash2: {
//     id1: rev1,
//     id2: rev2,
//     id2: rev2,
//   },
// }

const getAlreadyPurgedDocs = async (roleHashes, groups, ids) => {
  const purgedDocsByHash = Object.fromEntries(roleHashes.map(hash => [hash, {}]));

  if (!ids || !ids.length) {
    return purgedDocsByHash;
  }

  for (const hash of roleHashes) {
    const knownIds = [];

    const purgeDb = getPurgeDb(hash);
    if (Object.keys(groups).length) {
      const purgeGroupIds = Object
        .values(groups)
        .map(group => serverSidePurgeUtils.getPurgedGroupId(group.contact._id));
      const purgeGroups = await purgeDb.allDocs({ include_docs: true, keys: purgeGroupIds });

      for (const { doc } of purgeGroups.rows) {
        if (!doc) {
          continue;
        }
        purgedDocsByHash[hash][serverSidePurgeUtils.extractId(doc._id)] = doc._rev;
        Object.assign(purgedDocsByHash[hash], doc.ids);
        knownIds.push(...Object.keys(doc.ids), serverSidePurgeUtils.extractId(doc._id));
      }
    }

    const unknownIds = [...ids];
    if (!unknownIds.length) {
      continue;
    }

    const purgedDocs = await purgeDb.allDocs({ keys: unknownIds.map(id => serverSidePurgeUtils.getPurgedId(id)) });
    for (const row of purgedDocs.rows) {
      if (row.id && !row.value?.deleted) {
        purgedDocsByHash[hash][serverSidePurgeUtils.extractId(row.id)] = row.value.rev;
      }
    }
  }

  return purgedDocsByHash;
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

const getPurgedGroup = (group, alreadyPurged, toPurge) => {
  const contactId = group.contact._id;
  const purgedContactDocId = serverSidePurgeUtils.getPurgedGroupId(contactId);

  const doc = {
    _id: purgedContactDocId,
    _rev: alreadyPurged[contactId],
  };

  if (!group.ids.length) {
    return { _deleted: true, ...doc };
  }

  return {
    ...doc,
    purged_contact: toPurge[contactId] || false,
    ids: Object.fromEntries(group.ids.map(id => [id,  (toPurge[id] && alreadyPurged[id]) || false])),
  };
};

const getPurgeUpdates = (ids, alreadyPurged, toPurge) => {
  const docs = [];
  for (const id of ids) {

    // do nothing if purge state is unchanged
    if (!!alreadyPurged[id] !== !!toPurge[id]) {
      docs.push({
        _id: serverSidePurgeUtils.getPurgedId(id),
        _rev: alreadyPurged[id] || undefined,
        _deleted: !toPurge[id]
      });
    }
  }

  return docs;
};

const updatePurgedDocs = async (rolesHashes, groups, ids, alreadyPurged, toPurge) => {
  for (const hash of rolesHashes) {
    const docs = getPurgeUpdates(ids, alreadyPurged[hash], toPurge[hash]);

    if (docs.length) {
      const results =  await bulkDocs(getPurgeDb(hash), docs);
      for (const result of results) {
        alreadyPurged[hash][serverSidePurgeUtils.extractId(result.id)] = result.rev;
      }
    }

    const groupDocs = Object.values(groups).map(group => getPurgedGroup(group, alreadyPurged[hash], toPurge[hash]));
    await bulkDocs(getPurgeDb(hash), groupDocs);
  }
};

const validPurgeResults = (result) => result && Array.isArray(result);
const bulkDocs = async (dbInstance, docs) => {
  docs = docs.filter(doc => !!doc && (doc._rev || !doc._deleted)).map(doc => {
    if (!doc._deleted) {
      delete doc._deleted;
    }
    if (!doc._rev) {
      delete doc._rev;
    }

    return doc;
  });

  const results = await dbInstance.bulkDocs({ docs });
  const conflicts = results.filter(result => result.error === 'conflict');
  if (conflicts.length) {
    throw new Error(`Conflicts while purging: ${conflicts.map(result => result.id).join(', ')}`);
  }
  return results;
};

const assignContactToGroups = (row, groups, subjectIds) => {
  groups[row.id] = {
    reports: [],
    messages: [],
    ids: [],
    contact: row.doc,
    subjectIds: registrationUtils.getSubjectIds(row.doc),
  };
  subjectIds.push(...groups[row.id].subjectIds);
};

const getRecordGroupInfo = (hit) => {
  if (hit.doc.form) {
    // use subject as a key, as to keep subject to report associations correct
    // reports without a subject are processed separately
    return { key: hit.fields.subject, report: hit.doc };
  }

  // messages only have one key, either their sender or receiver
  return { key: hit.fields.key, message: hit.doc };
};

/**
 * Adds array of nouveau index hits that match the given subjectIds to the contact context groups.
 * @param groups
 * @param subjectIds
 * @returns {Promise<void>}
 */
const getRecordsForContacts = async (groups, subjectIds) => {
  const results = [];
  const subjectsCopy = [...subjectIds];
  do {
    const batch = subjectsCopy.splice(0, nouveau.BATCH_LIMIT);
    const batchResults = await getRecordsForContactsBatch(batch);
    results.push(...batchResults);
  } while (subjectsCopy.length && results.length < MAX_BATCH_SIZE);

  logger.info(`Found ${results.length} records`);
  if (results.length >= MAX_BATCH_SIZE) {
    throw Object.assign(
      new Error(`Purging skipped. Too many records for contacts: ${Object.keys(groups).join(', ')}`),
      {
        code: MAX_BATCH_SIZE_REACHED,
        contactIds: Object.keys(groups),
      }
    );
  }

  if (!results.length) {
    return;
  }

  if (results.length < MIN_BATCH_SIZE) {
    increaseBatchSize();
  }
  assignRecordsToGroups(results, groups);
};

const getRecordsForContactsBatch = async (subjectIds) => {
  if (!subjectIds.length) {
    return [];
  }

  const opts = {
    q: `subject:(${subjectIds.map(nouveau.escapeKeys).join(' OR ')}) AND type:data_record`,
    include_docs: true,
    limit: MAX_BATCH_SIZE,
  };

  const result = await request.post({
    uri: `${environment.couchUrl}/_design/medic/_nouveau/docs_by_replication_key`,
    body: opts
  });

  return result.hits;
};

const getRecordsByKey = (hits) => {
  const recordsByKey = {};
  hits.forEach(hit => {
    const { key, report, message } = getRecordGroupInfo(hit);
    recordsByKey[key] = recordsByKey[key] || { reports: [], messages: [] };

    return report ?
      recordsByKey[key].reports.push(report) :
      recordsByKey[key].messages.push(message);
  });
  return recordsByKey;
};

const assignRecordsToGroups = (hits, groups) => {
  const recordsByKey = getRecordsByKey(hits);

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
  const permissionSettings = config.get('permissions');

  Object.values(groups).forEach(group => {
    rolesHashes.forEach(hash => {
      toPurge[hash] = toPurge[hash] || {};
      if (!group.ids.length) {
        return;
      }

      const idsToPurge = purgeFn(
        { roles: roles[hash] },
        group.contact,
        group.reports,
        group.messages,
        cht.getDatasource(dataContext),
        permissionSettings
      );
      if (!validPurgeResults(idsToPurge)) {
        return;
      }

      idsToPurge.forEach(id => {
        toPurge[hash][id] = group.ids.includes(id) || group.contact._id === id;
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

const batchedContactsPurge = async (roles, purgeFn, startKey = '', startKeyDocId = '') => {
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
    reduce: false,
    limit: limit,
    start_key: JSON.stringify(startKey),
    startkey_docid: startKeyDocId,
    include_docs: true,
  };

  // using `db.queryMedic` library because PouchDB doesn't support `startkey_docid` in view queries
  // using `startkey_docid` because using `skip` is *very* slow
  try {
    const queryResult = await db.queryMedic('medic-client/contacts_by_type', queryString);
    queryResult.rows.forEach(row => {
      if (row.id === startKeyDocId) {
        return;
      }
      nextBatch = true;
      ({ id: nextKeyDocId, key: nextKey } = row);
      assignContactToGroups(row, groups, subjectIds);
    });

    await getRecordsForContacts(groups, subjectIds);
    docIds = getIdsFromGroups(groups);
    const alreadyPurged = await getAlreadyPurgedDocs(rolesHashes, groups, docIds);

    const toPurge = getDocsToPurge(purgeFn, groups, roles);
    await updatePurgedDocs(rolesHashes, groups, docIds, alreadyPurged, toPurge);

    return { nextKey, nextKeyDocId, nextBatch };
  } catch (err) {
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
  }
};

const purgeUnallocatedRecords = async (roles, purgeFn) => {
  let startKeyDocId = '';
  let startKey = '';
  let nextBatch;

  const getBatch = async () => {
    const opts = {
      limit: MAX_BATCH_SIZE,
      include_docs: true,
      q: `key:_unassigned`,
    };
    if (startKey) {
      opts.bookmark = startKey;
    }
    const results = await request.post({
      url: `${environment.couchUrl}/_design/medic/_nouveau/docs_by_replication_key`,
      body: opts,
    });

    const viewResults = {
      rows: [],
      bookmark: results.bookmark
    };

    for (const hit of results.hits) {
      viewResults.rows.push({
        id: hit.id,
        value: hit.fields,
        doc: hit.doc,
      });
    }

    return viewResults;
  };

  const permissionSettings = config.get('permissions');

  const getIdsToPurge = (rolesHashes, rows) => {
    const toPurge = {};
    const datasource = cht.getDatasource(dataContext);
    rows.forEach(row => {
      const doc = row.doc;
      rolesHashes.forEach(hash => {
        toPurge[hash] = toPurge[hash] || {};
        const purgeIds = doc.form ?
          purgeFn({ roles: roles[hash] }, {}, [doc], [], datasource, permissionSettings) :
          purgeFn({ roles: roles[hash] }, {}, [], [doc], datasource, permissionSettings);

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
      if (result.bookmark) {
        nextKey = result.bookmark;
      }

      result.rows.forEach(row => {
        if (row.id === startKeyDocId) {
          return;
        }

        if (!result.bookmark) {
          ({ id: nextKeyDocId, key: nextKey } = row);
        }
        nextBatch = true;
        docIds.push(row.id);
        rows.push(row);
      });

      return getAlreadyPurgedDocs(rolesHashes, {}, docIds);
    })
    .then(alreadyPurged => {
      const toPurge = getIdsToPurge(rolesHashes, rows);
      return updatePurgedDocs(rolesHashes, {}, docIds, alreadyPurged, toPurge);
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
