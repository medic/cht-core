const config = require('../config');
const request = require('request-promise-native');
const registrationUtils = require('@medic/registration-utils');
const tombstoneUtils = require('@medic/tombstone-utils');
const serverSidePurgeUtils = require('@medic/purging-utils');
const logger = require('./logger');
const { performance } = require('perf_hooks');
const db = require('../db');

let purgeDbs = {};
let purging = false;
const getPurgeDb = (hash, force) => {
  if (!purgeDbs[hash] || force) {
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

        const r = serverSidePurgeUtils.sortedUniqueRoles(row.doc.roles);
        list[JSON.stringify(r)] = r;
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

const getExistentPurgedDocs = (roleHashes, ids) => {
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

  try {
    return eval(`(${purgeConfig.fn})`);
  } catch (err) {
    logger.error('Failed to parse purge function: %o', err);
  }
};

const updatePurgedDocs = (rolesHashes, ids, currentlyPurged, newPurged) => {
  const docs = {};

  ids.forEach(id => {
    rolesHashes.forEach(hash => {
      docs[hash] = docs[hash] || [];

      const isPurged = currentlyPurged[hash][id];
      const shouldPurge = newPurged[hash][id];

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

const batchedContactsPurge = (roles, purgeFn, startKey = '', startKeyDocId = '') => {
  let nextKeyDocId;
  let nextKey;
  const groups = {};
  const docIds = [];
  const subjectIds = [];
  const rolesHashes = Object.keys(roles);

  logger.debug(`Starting contacts purge batch starting with key ${startKey} with id ${startKeyDocId}`);

  const queryString = {
    limit: BATCH_SIZE,
    start_key: JSON.stringify(startKey),
    startkey_docid: startKeyDocId,
    include_docs: true,
  };

  // using http requests because PouchDB doesn't support `startkey_docid` in view queries
  // using `startkey_docid` because using `skip` is *very* slow
  return request
    .get(`${db.couchUrl}/_design/medic-client/_view/contacts_by_type`, { qs: queryString, json: true })
    .then(result => {
      result.rows.forEach(row => {
        if (row.id === startKeyDocId) {
          return;
        }

        nextKeyDocId = row.id;
        nextKey = row.key;

        let contactId;
        let contact = row.doc;
        let contactSubjects;
        if (tombstoneUtils.isTombstoneId(row.id)) {
          // we keep tombstones here just as a means to group reports and messages from deleted contacts, but
          // finally not provide the actual contact in the purge function. we will also not "purge" tombstones.
          contactId =  tombstoneUtils.extractStub(row.id).id;
          contact = { _deleted: true };
          contactSubjects = registrationUtils.getSubjectIds(row.doc.tombstone);
        } else {
          contactId = row.id;
          docIds.push(contactId);
          contactSubjects = registrationUtils.getSubjectIds(contact);
        }

        subjectIds.push(...contactSubjects);
        groups[contactId] = { contact, subjectIds: contactSubjects, reports: [], messages: [] };
      });

      return db.medic.query('medic/docs_by_replication_key', { keys: subjectIds, include_docs: true });
    })
    .then(result => {
      const reportsByKey = {};
      const messagesByKey = {};
      const keys = new Set();

      result.rows.forEach(row => {
        if (groups[row.id]) {
          return;
        }

        // we don't purge tombstones
        if (tombstoneUtils.isTombstoneId(row.id)) {
          return;
        }

        let key;
        docIds.push(row.id);

        if (row.doc.form) {
          // use patientId as a key, as to keep contact to report associations correct
          key = registrationUtils.getPatientId(row.doc);
          if (row.doc.needs_signoff) {
            // reports with needs_signoff will emit for every contact from submitter lineage,
            // but we only want to process once either associated to their patient or alone, if no patient_id
            if (key && !subjectIds.includes(key)) {
              return;
            }
            const submitter = row.doc.contact && row.doc.contact._id;
            if (!key && !subjectIds.includes(submitter)) {
              return;
            }
          }

          reportsByKey[key] = reportsByKey[key] || [];
          reportsByKey[key].push(row.doc);
        } else {
          key = row.key;
          messagesByKey[key] = messagesByKey[key] || [];
          messagesByKey[key].push(row.doc);
        }

        if (!subjectIds.includes(key)) {
          groups[key] = { contact: {}, subjectIds: [key], reports: [], messages: [] };
        }
        keys.add(key);
      });

      keys.forEach(key => {
        if (!messagesByKey[key] && !reportsByKey[key]) {
          return;
        }
        if (!key) {
          // reports that have no patient_id, create a group for each one to be processed individually
          reportsByKey[key].forEach(report => {
            groups[report._id] = { contact: {}, reports: [report], messages: [] };
          });
          return;
        }

        const group = Object.values(groups).find(group => group.subjectIds.includes(key));
        if (reportsByKey[key]) {
          group.reports.push(...reportsByKey[key]);
        }
        if (messagesByKey[key]) {
          group.messages.push(...messagesByKey[key]);
        }
      });

      return getExistentPurgedDocs(rolesHashes, docIds);
    })
    .then(currentlyPurged => {
      const purgedPerHash = {};

      Object.values(groups).forEach(group => {
        rolesHashes.forEach(hash => {
          purgedPerHash[hash] = purgedPerHash[hash] || {};

          const allowedIds = [
            group.contact._id,
            ...group.reports.map(r => r._id),
            ...group.messages.map(r => r._id)
          ].filter(id => id);
          if (!allowedIds.length) {
            return;
          }

          const purgeResult = purgeFn({ roles: roles[hash] }, group.contact, group.reports, group.messages);
          if (!purgeResult || !Array.isArray(purgeResult) || !purgeResult.length) {
            return;
          }

          purgeResult.forEach(id => {
            if (!allowedIds.includes(id)) {
              return;
            }
            purgedPerHash[hash][id] = true;
          });
        });
      });

      return updatePurgedDocs(rolesHashes, docIds, currentlyPurged, purgedPerHash);
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

      return getExistentPurgedDocs(rolesHashes, docIds);
    })
    .then(currentlyPurged => {
      const purgedPerHash = {};
      docs.forEach(doc => {
        rolesHashes.forEach(hash => {
          purgedPerHash[hash] = purgedPerHash[hash] || {};
          const purgeResult = doc.form ?
            purgeFn({ roles: roles[hash] }, {}, [doc], []) :
            purgeFn({ roles: roles[hash] }, {}, [], [doc]);

          if (!purgeResult || !Array.isArray(purgeResult) || !purgeResult.length) {
            return;
          }

          purgeResult.forEach(id => {
            if (id !== doc._id) {
              return;
            }
            purgedPerHash[hash][id] = true;
          });
        });
      });

      return updatePurgedDocs(rolesHashes, docIds, currentlyPurged, purgedPerHash);
    })
    .then(() => nextKeyDocId && batchedUnallocatedPurge(roles, purgeFn, nextKeyDocId));
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
  if (purging) {
    return;
  }
  logger.info('Running server side purge');
  const purgeFn = getPurgeFn();
  if (!purgeFn) {
    logger.info('No purge function configured.');
    return Promise.resolve();
  }

  purging = true;
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
        .then(() => {
          const duration = (performance.now() - start);
          logger.info(`Server Side Purge completed successfully in ${duration / 1000 / 60} minutes`);
          return writePurgeLog(roles, duration);
        });
    })
    .catch(err => {
      logger.error('Error while running Server Side Purge: %o', err);
    })
    .finally(() => purging = false);
};

module.exports = {
  purge,
};
