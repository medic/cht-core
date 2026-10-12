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
const { roles } = require('@medic/user-management')(config, db, dataContext);
const moment = require('moment');
const { SENTINEL_METADATA } = require('@medic/constants');

const CONTACTS_BATCH_SIZE = 1000;
const MAX_BATCH_SIZE = 20 * 1000;
const RECORDS_PAGE_SIZE = 2000;

let skippedContacts = [];

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
      .put({ _id: SENTINEL_METADATA.PURGE_DB_INFO, roles: roles[hash] })
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

const getRoles = async () => {
  const dedupedByRoles = new Map();
  const rolesByHash = {};

  const { rows } = await db.users.allDocs({ include_docs: true });

  for (const { doc } of rows) {
    const userRoles = doc?.roles;

    if (!Array.isArray(userRoles) || !userRoles.length || !roles.isOffline(userRoles)) {
      continue;
    }

    const rolesList = serverSidePurgeUtils.sortedUniqueRoles(userRoles);
    dedupedByRoles.set(JSON.stringify(rolesList), rolesList);
  }

  for (const rolesList of dedupedByRoles.values()) {
    rolesByHash[serverSidePurgeUtils.getRoleHash(rolesList)] = rolesList;
  }

  return rolesByHash;
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

  return Promise
    .all(roleHashes.map(hash => getPurgeDb(hash).allDocs({ keys: purgeIds })))
    .then(results => {
      results.forEach((result, idx) => {
        const hash = roleHashes[idx];
        for (const row of result.rows) {
          if (row.value && !row.value.deleted) {
            purged[hash][serverSidePurgeUtils.extractId(row.id)] = row.value.rev;
          }
        }
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
  const contact = row.doc;
  group.contact = row.doc;
  group.subjectIds = registrationUtils.getSubjectIds(contact);
  group.ids.push(row.id);

  groups[row.id] = group;
  subjectIds.push(...group.subjectIds);
};

const getRecordGroupInfo = (row, subjectIds) => {
  if (row.doc.form) {
    const subjectId = registrationUtils.getSubjectId(row.doc);
    // use subject as a key, as to keep subject to report associations correct
    // reports without a subject are processed separately

    const key = (subjectId && subjectIds.includes(subjectId)) ? subjectId : row.id;
    return { key, report: row.doc };
  }

  // messages only emit once, either their sender or receiver
  return { key: row.subject, message: row.doc };
};

const hydrateRecords = async (recordRows) => {
  const recordIds = recordRows.map(row => row.id);

  const allDocsResult = await db.medic.allDocs({ keys: recordIds, include_docs: true });
  recordRows.forEach((row, idx) => row.doc = allDocsResult.rows[idx].doc);
  return recordRows.filter(row => row.doc);
};

const getRecordsForSubjects = async (subjectIds) => {
  const records = [];
  let bookmark;
  let hits;

  do {
    const opts = {
      q: `subject:(${subjectIds.map(nouveau.escapeKeys).join(' OR ')}) AND type:data_record`,
      limit: RECORDS_PAGE_SIZE,
    };
    if (bookmark) {
      opts.bookmark = bookmark;
    }
    const result = await request.post({
      uri: `${environment.couchUrl}/_design/medic/_nouveau/docs_by_replication_key`,
      body: opts
    });

    ({ bookmark, hits } = result);
    records.push(...hits.map(hit => ({ id: hit.id, subject: hit.fields.subject })));
  } while (bookmark && hits.length >= RECORDS_PAGE_SIZE);

  return records;
};

const getRecordsByContact = async (contactRows) => {
  const contactIdBySubject = {};
  const subjectIds = [];
  contactRows.forEach(row => {
    registrationUtils.getSubjectIds(row.doc).forEach(subjectId => {
      contactIdBySubject[subjectId] = row.id;
      subjectIds.push(subjectId);
    });
  });

  const recordsByContact = {};
  for (let i = 0; i < subjectIds.length; i += nouveau.BATCH_LIMIT) {
    const records = await getRecordsForSubjects(subjectIds.slice(i, i + nouveau.BATCH_LIMIT));
    records.forEach(record => {
      const contactId = contactIdBySubject[record.subject];
      recordsByContact[contactId] = recordsByContact[contactId] || [];
      recordsByContact[contactId].push(record);
    });
  }

  return recordsByContact;
};

const purgeContactsGroups = async (roles, purgeFn, contactRows, records) => {
  if (!contactRows.length) {
    return;
  }

  const groups = {};
  const subjectIds = [];
  const rolesHashes = Object.keys(roles);

  contactRows.forEach(row => assignContactToGroups(row, groups, subjectIds));
  if (records.length) {
    const hydratedRecords = await hydrateRecords(records);
    const recordsByKey = getRecordsByKey(hydratedRecords, subjectIds);
    assignRecordsToGroups(recordsByKey, groups);
  }

  const docIds = getIdsFromGroups(groups);
  const alreadyPurged = await getAlreadyPurgedDocs(rolesHashes, docIds);
  const toPurge = getDocsToPurge(purgeFn, groups, roles);
  await updatePurgedDocs(rolesHashes, docIds, alreadyPurged, toPurge);
};

const getRecordsByKey = (rows, subjectIds) => {
  const recordsByKey = {};
  rows.forEach(row => {
    const { key, report, message } = getRecordGroupInfo(row, subjectIds);
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
        cht.getDatasource(dataContext),
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

const batchedContactsPurge = async (roles, purgeFn, startKey = '', startKeyDocId = '') => {
  logger.info(`Purging: Starting contacts batch: key "${startKey}", doc id "${startKeyDocId}"`);

  // every request with `startKeyDocId` will include the startKeyDocId document as the 1st result.
  // this document was already processed and it's skipped.
  const limit = startKeyDocId !== '' ? CONTACTS_BATCH_SIZE + 1 : CONTACTS_BATCH_SIZE;
  const queryString = {
    reduce: false,
    limit: limit,
    start_key: JSON.stringify(startKey),
    startkey_docid: startKeyDocId,
    include_docs: true,
  };

  // using `db.queryMedic` library because PouchDB doesn't support `startkey_docid` in view queries
  // using `startkey_docid` because using `skip` is *very* slow
  const result = await db.queryMedic('medic-client/contacts_by_type', queryString);
  const contactRows = result.rows.filter(row => row.id !== startKeyDocId);
  if (!contactRows.length) {
    return { nextBatch: false };
  }

  const recordsByContact = await getRecordsByContact(contactRows);

  let batchRows = [];
  let batchRecords = [];
  for (const row of contactRows) {
    const contactRecords = recordsByContact[row.id] || [];
    if (contactRecords.length > MAX_BATCH_SIZE) {
      logger.warn(`Purging: Too many reports to purge. Skipping contact ${row.id}.`);
      skippedContacts.push(row.id);
      continue;
    }

    if (batchRecords.length + contactRecords.length > MAX_BATCH_SIZE) {
      await purgeContactsGroups(roles, purgeFn, batchRows, batchRecords);
      batchRows = [];
      batchRecords = [];
    }
    batchRows.push(row);
    batchRecords.push(...contactRecords);
  }
  await purgeContactsGroups(roles, purgeFn, batchRows, batchRecords);

  const lastRow = contactRows.at(-1);
  return { nextKey: lastRow.key, nextKeyDocId: lastRow.id, nextBatch: true };
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
// - for every batch of contacts, queries `docs_by_replication_key` with the resulting `subject_ids`, then hydrates
// and purges the contacts in sub-batches of at most MAX_BATCH_SIZE records. Contacts that alone exceed it are skipped
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
// - we query by subject, so reports that `needs_signoff` are not retrieved through their submitter lineage emits.
// As a consequence, orphaned reports with `needs_signoff` will not be purged

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
