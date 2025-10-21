const db = require('../db');
const dbWatcher = require('./db-watcher');
const environment = require('@medic/environment');
const purgingUtils = require('@medic/purging-utils');
const config = require('../config');
const configWatcher = require('./config-watcher');
const purgedDocsCache = require('./purged-docs-cache');
const _ = require('lodash');

const DB_NOT_FOUND_ERROR = new Error('not_found');
const USER_DOC_PREFIX = 'org.couchdb.user:';
const getPurgeDb = (roles) => {
  const hash = purgingUtils.getRoleHash(roles);
  const dbName = purgingUtils.getPurgeDbName(environment.db, hash);
  return db.exists(dbName).then(purgeDb => {
    if (!purgeDb) {
      throw DB_NOT_FOUND_ERROR;
    }
    return purgeDb;
  });
};

const catchDbNotFoundError = (err, purgeDb) => {
  if (err !== DB_NOT_FOUND_ERROR) {
    db.close(purgeDb);
    throw err;
  }
};

/**
 *
 * @param {AuthorizationContext} userCtx
 * @param {PouchDB} purgeDb
 * @returns {Promise<{ allIds: string[], purgedIds: string[] }>}
 */
const getPurgedIdsFromContacts = async (userCtx, purgeDb) => {
  let purgeIds = [];

  if (!userCtx?.subjectIds) {
    return purgeIds;
  }

  const purgedDocIds = userCtx.subjectIds.map(purgingUtils.getPurgedContactId);
  const results = await purgeDb.allDocs({ doc_ids: purgedDocIds, include_docs: true });
  results.rows.forEach(row => {
    if (row.doc?.ids) {
      purgeIds = { ...purgeIds, ...row.doc.ids };
    }
  });
  const allIds = Object.keys(purgeIds);
  const purgedIds = Object.entries(purgeIds).map(([id, purged]) => purged ? id : null).filter(Boolean);

  return { allIds, purgedIds };
};

/**
 * Returns the ids of the documents that have been purged for the user
 * @param {AuthorizationContext} userCtx
 * @param {string[]} docIds
 * @param {boolean} useCache
 * @returns {Promise<string[]>}
 */
const getPurgedIds = async (userCtx, docIds, useCache = true) => {
  let purgeIds = [];
  if (!docIds?.length || !userCtx.roles?.length) {
    return Promise.resolve(purgeIds);
  }

  if (useCache) {
    const cachedIds = await purgedDocsCache.get(userCtx.name);
    if (cachedIds) {
      return Promise.resolve(cachedIds);
    }
  }

  let purgeDb;

  try {
    purgeDb = await getPurgeDb(userCtx.roles);
    const purgedIdsFromContacts = await getPurgedIdsFromContacts(userCtx, purgeDb);

    purgeIds = purgedIdsFromContacts.purgedIds;
    const unknownPurgedIds = _.difference(docIds, purgedIdsFromContacts.allIds);

    const results = await purgeDb.allDocs({ doc_ids: unknownPurgedIds.map(purgingUtils.getPurgedId) });
    purgeIds.push(results.rows.map(row => purgingUtils.extractId(row.id)));

    useCache && await purgedDocsCache.set(userCtx.name, purgeIds);
    db.close(purgeDb);

  } catch (err) {
    catchDbNotFoundError(err, purgeDb);
  }

  return purgeIds;
};

const getUnPurgedIds = (userCtx, docIds) => {
  docIds.sort();
  return getPurgedIds(userCtx, docIds).then(purgedIds => _.difference(docIds, purgedIds));
};

const listen = () => {
  watchSentinel();
  watchUsers();
  watchMedic();
  watchSettings();
};

const watchSentinel = () => {
  dbWatcher.sentinel(change => {
    if (change.id.startsWith('purgelog:') && change.changes[0].rev.startsWith('1-')) {
      return purgedDocsCache.wipe();
    }
  });
};

const watchUsers = () => {
  dbWatcher.users(({ id }) => {
    if (id.startsWith(USER_DOC_PREFIX)) {
      const name = id.replace(USER_DOC_PREFIX, '');
      return purgedDocsCache.clear(name);
    }
  });
};

const watchMedic = () => {
  dbWatcher.medic(({ id }) => {
    if (id.startsWith(USER_DOC_PREFIX)) {
      const name = id.replace(USER_DOC_PREFIX, '');
      return purgedDocsCache.clear(name);
    }
  });
};

const watchSettings = () => {
  const key = 'district_admins_access_unallocated_messages';
  let district_admins_access_unallocated_messages = config.get(key);
  configWatcher.watch(() => {
    const newConfigValue = config.get(key);
    if (newConfigValue !== district_admins_access_unallocated_messages) {
      district_admins_access_unallocated_messages = newConfigValue;
      purgedDocsCache.wipe();
    }
  });
};

if (!process.env.UNIT_TEST_ENV) {
  purgedDocsCache.wipe();
  listen();
}

module.exports = {
  getPurgedIds,
  getUnPurgedIds,
};

