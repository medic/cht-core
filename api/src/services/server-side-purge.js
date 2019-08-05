const db = require('../db');
const environment = require('../environment');
const cache = require('./cache');
const crypto = require('crypto');
const request = require('request-promise-native');
const registrationUtils = require('@medic/registration-utils');
const tombstoneUtils = require('@medic/tombstone-utils');
const viewMapUtils = require('@medic/view-map-utils');
const config = require('../config');
const logger = require('../logger');
const { performance } = require('perf_hooks');
const auth = require('../auth');

const BATCH_SIZE = 1000;

const purgeDbs = {};
const sortedUniqueRoles = roles => ([...new Set(roles.sort())]);
const getRoleHash = roles => crypto
  .createHash('md5')
  .update(JSON.stringify(sortedUniqueRoles(roles)), 'utf8')
  .digest('hex');

const getPurgeDb = (roles, force = false) => {
  const hash = typeof roles === 'string' ? roles : getRoleHash(roles);
  if (!purgeDbs[hash] || force) {
    purgeDbs[hash] = db.get(`${environment.db}-purged-role-${hash}`);
  }
  return purgeDbs[hash];
};

const getCacheKey = (roles, docIds) => {
  const hash = crypto
    .createHash('md5')
    .update(JSON.stringify(docIds), 'utf8')
    .digest('hex');

  return `purged-${JSON.stringify(roles)}-${hash}`;
};

const getPurgedId = id => `purged:${id}`;
const extractId = purgedId => purgedId.replace(/^purged:/, '');

const getPurgedIdsFromChanges = result => {
  const purgedIds = [];
  result.results.forEach(change => {
    if (!change.deleted) {
      purgedIds.push(extractId(change.id));
    }
  });
  return purgedIds;
};

const getPurgedIds = (roles, docIds) => {
  const cacheKey = getCacheKey(roles, docIds);
  const cached = cache.get(cacheKey);
  if (cached) {
    cache.ttl(cacheKey);
    return Promise.resolve(cached);
  }

  const purgeDb = getPurgeDb(roles);
  const ids = docIds.map(getPurgedId);

  return purgeDb
    .changes({ doc_ids: ids, batch_size: ids.length + 1, seq_interval: ids.length })
    .then(result => getPurgedIdsFromChanges(result));
};

const getPurgedIdsSince = (roles, docIds, { checkPointerId = '', limit = 100 } = {}) => {
  const purgeDb = getPurgeDb(roles);
  const ids = docIds.map(getPurgedId);

  return getCheckPointer(purgeDb, checkPointerId)
    .then(checkPointer => {
      const opts = {
        doc_ids: ids,
        batch_size: ids.length + 1,
        limit: limit,
        since: checkPointer.last_seq,
        seq_interval: ids.length
      };

      return purgeDb.changes(opts);
    })
    .then(result => {
      const purgedDocIds = getPurgedIdsFromChanges(result);
      return {
        purgedDocIds,
        lastSeq: result.last_seq
      };
    });
};

const getCheckPointer = (db, checkPointerId) => db
  .get(`_local/${checkPointerId}`)
  .catch(() => ({
    _id: `_local/${checkPointerId}`,
    last_seq: 0
  }));

const writeCheckPointer = (roles, checkPointerId, seq = 0) => {
  const purgeDb = getPurgeDb(roles);

  return Promise
    .all([
      getCheckPointer(purgeDb, checkPointerId),
      purgeDb.info()
    ])
    .then(([ checkPointer, info ]) => {
      checkPointer.last_seq = seq === 'now' ? info.update_seq : seq;
      purgeDb.put(checkPointer);
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
            !auth.isOffline(row.doc.roles)
        ) {
          return;
        }

        const r = sortedUniqueRoles(row.doc.roles);
        list[JSON.stringify(r)] = r;
      });

      Object.values(list).forEach(list => {
        const hash = getRoleHash(list);
        roles[hash] = list;
      });

      return roles;
    });
};

const initPurgeDbs = (roles) => {
  return Promise.all(Object.keys(roles).map(hash => {
    const purgeDb = getPurgeDb(hash, true);
    return purgeDb.put({ _id: 'local/info', roles: roles[hash] }).catch(() => {}); // catch 409s here
  }));
};

const getExistentPurgedDocs = (roles, ids) => {
  if (!ids.length) {
    return Promise.resolve({});
  }

  const purgeIds = ids.map(id => getPurgedId(id));
  const roleHashes = Object.keys(roles);
  const changesOpts = {
    doc_ids: purgeIds,
    batch_size: purgeIds.length + 1,
    seq_interval: purgeIds.length
  };

  return Promise
    .all(roleHashes.map(hash => getPurgeDb(hash).changes(changesOpts)))
    .then(results => {
      const purged = {};
      results.forEach((result, idx) => {
        const hash = roleHashes[idx];
        purged[hash] = {};
        result.results.forEach(change => {
          if (!change.deleted) {
            purged[hash][extractId(change.id)] = change.changes[0].rev;
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

const updatePurgedDocs = (roles, ids, currentlyPurged, newPurged) => {
  const docs = {};
  const rolesHashes = Object.keys(roles);

  ids.forEach(id => {
    rolesHashes.forEach(hash => {
      if (!docs[hash]) {
        docs[hash] = [];
      }
      const isPurged = currentlyPurged[hash][id];
      const shouldPurge = newPurged[hash][id];

      // do nothing if purge state is unchanged
      if (!!isPurged === !!shouldPurge) {
        return;
      }

      if (isPurged) {
        docs[hash].push({ _id: getPurgedId(id), _rev: isPurged, _deleted: true });
      } else {
        docs[hash].push({ _id: getPurgedId(id) });
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

const getRootContacts = () => {
  return db.medic
    .query('medic-client/doc_by_type', { key: ['district_hospital'] })
    .then(result => result.rows.map(row => row.id));
};

const batchedContactsPurge = (roles, purgeFn, rootIds, rootId, startKeyDocId = '') => {
  if (!rootIds.length && !rootId) {
    // WE ARE DONE
    return Promise.resolve();
  }

  rootId = rootId || rootIds.shift();
  let nextKeyDocId;
  const groups = {};
  const docIds = [];
  const subjectIds = [];

  logger.debug(`Starting contacts purge batch for district ${rootId} with id ${startKeyDocId}`);

  const queryString = {
    limit: BATCH_SIZE,
    key:  JSON.stringify([rootId]),
    startkey_docid: startKeyDocId
  };

  // using http requests because PouchDB doesn't support `startkey_docid` in view queries
  return request
    .get(`${environment.couchUrl}/_design/medic/_view/contacts_by_depth`, { qs: queryString, json: true })
    .then(result => {
      result.rows.forEach(row => {
        if (row.id === startKeyDocId) {
          return;
        }

        nextKeyDocId = row.id;

        let contactId;
        let contact = {};
        if (tombstoneUtils.isTombstoneId(row.id)) {
          // we keep tombstones here just as a means to group reports and messages from deleted contacts, but
          // finally not provide the actual contact in the purge function. we will also not "purge" tombstones.
          contactId =  tombstoneUtils.extractStub(row.id).id;
          contact = { _deleted: true };
        } else {
          contactId = row.id;
          docIds.push(contactId);
        }

        const contactSubjects = [ contactId ];
        if (row.value) {
          contactSubjects.push(row.value);
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
          groups[row.id].contact = row.doc;
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
          const needsSignoff = row.doc.needs_signoff;
          if (needsSignoff && !subjectIds.includes(key)) {
            // reports with needs_signoff will emit for every contact from submitter lineage,
            // but we only want to process once either associated to their patient or alone, if no patient_id
            delete row.doc.needs_signoff;
            const viewKey = viewMapUtils.getViewMapFn('medic', 'docs_by_replication_key')(row.doc)[0][0];
            if (!subjectIds.includes(viewKey)) {
              return;
            }
            row.doc.needs_signoff = needsSignoff;
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

      return getExistentPurgedDocs(roles, docIds);
    })
    .then(currentlyPurged => {
      const purgedPerHash = {};
      const rolesHashes = Object.keys(roles);
      Object.keys(groups).forEach(key => {
        const group = groups[key];
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

      return updatePurgedDocs(roles, docIds, currentlyPurged, purgedPerHash);
    })
    .then(() => {
      return nextKeyDocId ?
        batchedContactsPurge(roles, purgeFn, rootIds, rootId, nextKeyDocId) :
        batchedContactsPurge(roles, purgeFn, rootIds);
    });
};

const batchedUnallocatedPurge = (roles, purgeFn, startKeyDocId = '') => {
  let nextKeyDocId;
  const docs = [];
  const docIds = [];

  logger.debug(`Starting unallocated purge batch with id ${startKeyDocId}`);

  const queryString = {
    limit: BATCH_SIZE,
    key: JSON.stringify('_unassigned'),
    startkey_docid: startKeyDocId,
    include_docs: true
  };

  return request
    .get(`${environment.couchUrl}/_design/medic/_view/docs_by_replication_key`, { qs: queryString, json: true })
    .then(result => {
      result.rows.forEach(row => {
        if (row.id === startKeyDocId) {
          return;
        }

        nextKeyDocId = row.id;
        docIds.push(row.id);
        docs.push(row.doc);
      });

      return getExistentPurgedDocs(roles, docIds);
    })
    .then(currentlyPurged => {
      const purgedPerHash = {};
      docs.forEach(doc => {
        Object.keys(roles).forEach(hash => {
          purgedPerHash[hash] = purgedPerHash[hash] || {};
          const purgeResult = doc.form ?
            purgeFn({ roles: roles[hash] }, null, [doc], []) :
            purgeFn({ roles: roles[hash] }, null, [], [doc]);

          purgeResult.forEach(id => {
            if (id !== doc._id) {
              return;
            }
            purgedPerHash[hash][id] = true;
          });
        });
      });

      return updatePurgedDocs(roles, docIds, currentlyPurged, purgedPerHash);
    })
    .then(() => nextKeyDocId && batchedUnallocatedPurge(roles, purgeFn, nextKeyDocId));
};

// purges documents that would be replicated by offline users
// - reads all user documents from the `_users` database to comprise a list of unique sets of roles
// - creates a database for each role set with the name `<main db name>-purged-role-<hash>` where `hash` is an md5 of
// the JSON.Stringify-ed list of roles
// - iterates over all contacts by querying `contacts_by_depth` using all root contact keys, in batches
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
  logger.info('Running server side purge');
  const purgeFn = getPurgeFn();
  if (!purgeFn) {
    logger.info('No purge function configured.');
    return;
  }

  const start = performance.now();
  return getRoles().then(roles => {
    if (!roles || !Object.keys(roles).length) {
      logger.info(`No offline users found. Not purging`);
      return;
    }

    return initPurgeDbs(roles)
      .then(() => getRootContacts())
      .then(ids => batchedContactsPurge(roles, purgeFn, ids))
      .then(() => batchedUnallocatedPurge(roles, purgeFn))
      .then(() => {
        logger.info(`Server Side Purge completed successfully in ${ (performance.now() - start) / 1000 / 60 } minutes`);
      });
  });
};

module.exports = {
  getPurgedIds,
  getPurgedIdsSince,
  writeCheckPointer,
  purge,
};


// used for testing
if (process.env.UNIT_TEST_ENV) {
  Object.assign(module.exports, {
    _purge: purge,
    _getCheckPointer: getCheckPointer,
    _getCacheKey: getCacheKey,
    _getRoleHash: getRoleHash,
    _getPurgeDb: getPurgeDb,
    _getPurgedId: getPurgedId,
    _extractId: extractId,
    _getPurgedIdsFromChanges: getPurgedIdsFromChanges,
    _getRoles: getRoles,
    _initPurgeDbs: initPurgeDbs,
    _getExistentPurgedDocs: getExistentPurgedDocs,
    _getPurgeFn: getPurgeFn,
    _updatePurgedDocs: updatePurgedDocs,
    _getRootContacts: getRootContacts,
    _batchedContactsPurge: batchedContactsPurge,
    _batchedUnallocatedPurge: batchedUnallocatedPurge,
    _reset: () => {
      Object.keys(purgeDbs).forEach(hash => delete purgeDbs[hash]);
    }
  });
}

