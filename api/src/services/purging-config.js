const serverSidePurgeUtils = require('@medic/purging-utils');
const chtScriptApi = require('@medic/cht-script-api');
const db = require('../db');
const logger = require('../logger');
const config = require('../config');

const purgeDbs = {};
const MAX_BATCH_SIZE = 20 * 1000;

const parsePurgeFn = (purgeFnString) => {
  let purgeFn;
  try {
    purgeFn = eval(`(${purgeFnString})`);
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
const getRoles = async () => {
  const list = [];
  const roles = {};

  const users = await db.users.allDocs({ include_docs: true });
  users.rows.forEach(row => {
    if (!row.doc ||
      !row.doc.roles ||
      !Array.isArray(row.doc.roles) ||
      !row.doc.roles.length ||
      !serverSidePurgeUtils.isOffline(config.get('roles'), row.doc.roles)
    ) {
      return;
    }

    const uniqueRoles = serverSidePurgeUtils.sortedUniqueRoles(row.doc.roles);
    list.push(uniqueRoles);
  });

  list.forEach(uniqueRoles => {
    const hash = serverSidePurgeUtils.getRoleHash(uniqueRoles);
    roles[hash] = uniqueRoles;
  });

  return roles;
};
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
const validPurgeResults = (result) => result && Array.isArray(result);
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
    // TODO: don't edit the db, just estimate how many docs *would* change
    return getPurgeDb(hash).bulkDocs({ docs: docs[hash] });
  }));
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
const countPurgedUnallocatedRecords = async (roles, purgeFn) => {
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
        toPurge[hash][doc._id] = purgeIds.includes(doc._id); // Record<hash, Record<docId, boolean>>
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

const dryRun = async (purgeFnString) => {
  // TODO: dry run current config and compare numbers
  // const purgeConfig = config.get('purge');
  // const currentPurgeFn = purgeConfig && purgeConfig.fn;

  const purgeFn = parsePurgeFn(purgeFnString);
  if (!purgeFn) {
    throw new Error('Purging: No purge function configured.');
  }

  const roles = await getRoles();
  await initPurgeDbs(roles);

  // purgeContacts(roles, purgeFn)
  await countPurgedUnallocatedRecords(roles, purgeFn);

  const documentsPurged = 0;
  const contactsPurged = 0;
  const nextRun = new Date().toISOString();

  return { documentsPurged, contactsPurged, nextRun };
};

module.exports = {
  dryRun,
};

