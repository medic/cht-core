const serverSidePurgeUtils = require('@medic/purging-utils');
const chtScriptApi = require('@medic/cht-script-api');
const db = require('../db');
const logger = require('../logger');
const config = require('../config');

const purgeDbs = {};

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
const getPurgingChangesCounts = (rolesHashes, ids, alreadyPurged, toPurge) => {
  let wontChangeCount = 0;
  let willPurgeCount = 0;
  let willUnpurgeCount = 0;

  ids.forEach(id => {
    rolesHashes.forEach(hash => {
      const isPurged = alreadyPurged[hash][id];
      const shouldPurge = toPurge[hash][id];

      // do nothing if purge state is unchanged
      if (!!isPurged === !!shouldPurge) {
        wontChangeCount++;
        return;
      }

      if (isPurged) {
        willUnpurgeCount++;
      } else {
        willPurgeCount++;
      }
    });
  });

  return {
    wontChangeCount,
    willPurgeCount,
    willUnpurgeCount,
  };
};
const simulatePurge = (getBatch, getIdsToPurge, roles) => {
  const rows = [];
  const docIds = [];
  const rolesHashes = Object.keys(roles);

  return getBatch()
    .then(result => {
      result.rows.forEach(row => {
        docIds.push(row.id);
        rows.push(row);
      });

      return getAlreadyPurgedDocs(rolesHashes, docIds);
    })
    .then(alreadyPurged => {
      const toPurge = getIdsToPurge(rolesHashes, rows);
      return getPurgingChangesCounts(rolesHashes, docIds, alreadyPurged, toPurge);
    });
};
const countPurgedUnallocatedRecords = async (roles, purgeFn) => {
  const permissionSettings = config.get('permissions');
  const getBatch = () =>  db.medic.query('medic/docs_by_replication_key', {
    key: '_unassigned',
    include_docs: true,
  });
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

  return await simulatePurge(getBatch, getIdsToPurge, roles);
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

  // const ddd = await countPurgedContacts(roles, purgeFn);
  const unallocatedRecords = await countPurgedUnallocatedRecords(roles, purgeFn);

  // TODO: maybe breakdown unallocatedRecords/contacts/reports/tasks/...
  let wontChangeCount = 0;
  wontChangeCount += unallocatedRecords.wontChangeCount;
  let willPurgeCount = 0;
  willPurgeCount += unallocatedRecords.willPurgeCount;
  let willUnpurgeCount = 0;
  willUnpurgeCount += unallocatedRecords.willUnpurgeCount;

  // TODO: parse cron like in `scheduling.js`
  const nextRun = new Date().toISOString();

  return { wontChangeCount, willPurgeCount, willUnpurgeCount, nextRun };
};

module.exports = {
  dryRun,
};

