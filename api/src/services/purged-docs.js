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
 * @param {string[]} groupIds
 * @param {PouchDB} purgeDb
 * @returns {Promise<{ allIds: string[], purgedIds: string[] }>}
 */
const getGroupPurgedIds = async (groupIds, purgeDb) => {
  let purgedIds = [];
  let allIds = [];

  if (!groupIds) {
    return { allIds, purgedIds };
  }

  const results = await purgeDb.allDocs({ keys: groupIds.map(purgingUtils.getPurgedGroupId), include_docs: true });
  for (const row of results.rows) {
    if (!row.doc) {
      continue;
    }
    const contactId = purgingUtils.extractId(row.id);
    if (row.doc.purged_contact) {
      purgedIds.push(contactId);
    }
    purgedIds = purgedIds.concat(Object.keys(row.doc.ids).filter(id => !!row.doc.ids[id]));
    allIds = allIds.concat(Object.keys(row.doc.ids), contactId);
  }

  return { allIds, purgedIds };
};

const getIndividualPurgedIds = async (purgeDb, docIds) => {
  const results = await purgeDb.allDocs({ keys: docIds.map(purgingUtils.getPurgedId) });
  return results.rows
    .filter(row => row.id && !row.value.deleted)
    .map(row => purgingUtils.extractId(row.id));
};

/**
 * Returns the ids of the documents that have been purged for the user
 * @param {userCtx} userCtx
 * @param {string[]} docIds
 * @param {boolean} useCache
 * @param {string[]} groupIds
 * @returns {Promise<string[]>}
 */
const getPurgedIds = async (userCtx, docIds, useCache = true, groupIds = []) => {
  if (useCache) {
    const cachedIds = await purgedDocsCache.get(userCtx.name);
    if (cachedIds) {
      return cachedIds;
    }
  }

  let purgeDb;
  let purgedIds = [];

  if (!docIds?.length || !userCtx.roles?.length) {
    return purgedIds;
  }

  try {
    purgeDb = await getPurgeDb(userCtx.roles);

    const groupPurgedIds = await getGroupPurgedIds(groupIds, purgeDb);
    purgedIds = _.intersection(docIds, groupPurgedIds.purgedIds);
    docIds = _.difference(docIds, groupPurgedIds.allIds);

    purgedIds = purgedIds.concat(await getIndividualPurgedIds(purgeDb, docIds));

    useCache && await purgedDocsCache.set(userCtx.name, purgedIds);
    db.close(purgeDb);
  } catch (err) {
    catchDbNotFoundError(err, purgeDb);
  }

  return purgedIds;
};

/**
 * Returns the ids of the documents that have not been purged for the user
 * @param {AuthorizationContext} authContext
 * @param docIds
 * @returns {Promise<*>}
 */
const getUnPurgedIds = async (authContext, docIds) => {
  const purgedIds = await getPurgedIds(authContext.userCtx, docIds, true, authContext.subjectIds);
  return _.difference(docIds, purgedIds);
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

