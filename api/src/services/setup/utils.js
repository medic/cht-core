const rpn = require('request-promise-native');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');

const db = require('../../db');
const logger = require('../../logger');
const environment = require('../../environment');
const upgradeLogService = require('./upgrade-log');

const PACKAGED_VERSION = 'local';
const DDOC_PREFIX = '_design/';
const BUILD_DOC_PREFIX = 'medic:medic:';
const STAGED_DDOC_PREFIX = `${DDOC_PREFIX}:staged:`;
const SOCKET_TIMEOUT_ERROR_CODE = 'ESOCKETTIMEDOUT';
const FILE_NOT_FOUND_ERROR_CODE = 'ENOENT';

if (!fs.promises) {
  const promisify = require('util').promisify;
  // temporary patching to work on Node 8.
  // This code will never run on Node 8 in prod!
  fs.promises = {
    mkdir: promisify(fs.mkdir),
    readdir: promisify(fs.readdir),
    rmdir: promisify(fs.readdir),
    unlink: promisify(fs.unlink),
    access: promisify(fs.access),
    writeFile: promisify(fs.writeFile),
    readFile: promisify(fs.readFile),
  };
}

/**
 * @typedef {Object} DesignDocument
 * @property {string} _id
 * @property {string} _rev
 * @property {string} version
 * @property {Object} views
 */

/**
 * @typedef {Object} Database
 * @property {string} name
 * @property {PouchDB} db
 * @property {string} jsonFileName
 */

const MEDIC_DATABASE = {
  name: environment.db,
  db: db.medic,
  jsonFileName: 'medic.json',
};

/**
 * @type {Array<Database>}
 */
const DATABASES = [
  MEDIC_DATABASE,
  {
    name: `${environment.db}-sentinel`,
    db: db.sentinel,
    jsonFileName: 'sentinel.json',
  },
  {
    name: `${environment.db}-logs`,
    db: db.medicLogs,
    jsonFileName: 'logs.json',
  },
  {
    name: `${environment.db}-users-meta`,
    db: db.medicUsersMeta,
    jsonFileName: 'users-meta.json',
  },
];

const isStagedDdoc = ddocId => ddocId.startsWith(STAGED_DDOC_PREFIX);
const getPackagedVersion = async () => {
  try {
    const medicDdocs = await getDdocJsonContents(path.join(environment.ddocsPath, MEDIC_DATABASE.jsonFileName));
    if (!medicDdocs || !medicDdocs.docs) {
      throw new Error('Cannot find medic db ddocs among packaged ddocs.');
    }
    const medicDdocId = getDdocId(environment.ddoc);
    const medicDdoc = medicDdocs.docs.find(ddoc => ddoc._id === medicDdocId);
    if (!medicDdoc) {
      throw new Error('Cannot find medic ddoc among packaged ddocs.');
    }
    return medicDdoc.version;
  } catch (err) {
    logger.error('Error when trying to determine packaged version: %o', err);
    throw err;
  }
};

/**
 * @param {Database} database
 * @param {Array<DesignDocument>} docs
 * @return {Promise}
 */
const deleteDocs = (database, docs) => {
  if (!docs.length) {
    return Promise.resolve([]);
  }
  docs.forEach(doc => doc._deleted = true);
  return saveDocs(database, docs);
};

/**
 * @param {Database} database
 * @param {Array<DesignDocument>} docs
 * @return {Promise}
 */
const saveDocs = async (database , docs) => {
  if (!docs.length) {
    return [];
  }

  const results = await database.db.bulkDocs(docs);
  const errors = results
    .filter(result => result.error)
    .map(result => `saving ${result.id} failed with ${result.error}`);

  if (!errors.length) {
    return results;
  }

  // todo try one by one!

  throw new Error(`Error while saving docs: ${errors.join(', ')}`);
};

/**
 * Deletes uploaded staged ddocs
 * @return {Promise}
 */
const deleteStagedDdocs = async () => {
  logger.info('Deleting existent staged ddocs');
  for (const database of DATABASES) {
    const stagedDdocs = await getStagedDdocs(database);
    await deleteDocs(database, stagedDdocs);
  }
};

/**
 * Runs compaction and view cleanup for every database.
 */
const cleanup = () => {
  for (const database of DATABASES) {
    logger.info(`Running DB compact and view cleanup for ${database.name}`);
    Promise
      .all([
        database.db.compact(),
        database.db.viewCleanup(),
      ])
      .catch(err => {
        logger.error('Error while running cleanup: %o', err);
      });
  }
};

/**
 * @param {Database} database
 * @return {Promise<Array<DesignDocument>>}
 */
const getStagedDdocs = async (database) => {
  const result = await database.db.allDocs({
    startkey: STAGED_DDOC_PREFIX,
    endkey: `${STAGED_DDOC_PREFIX}\ufff0`,
    include_docs: true,
  });
  return result.rows.map(row => row.doc);
};

/**
 * @param {Database} database
 * @param {Boolean} includeDocs
 * @return {Promise<Array<DesignDocument>>}
 */
const getDdocs = async (database) => {
  const opts = { startkey: DDOC_PREFIX, endkey: `${DDOC_PREFIX}\ufff0`, include_docs: true };
  const result = await database.db.allDocs(opts);
  return result.rows.map(row => row.doc);
};

/**
 * Returns a promise that resolves when a view is indexed.
 * Retries querying the view until no error is thrown
 * @param {String} dbName
 * @param {String} ddocId
 * @param {String} viewName
 * @return {Promise}
 */
const indexView = async (dbName, ddocId, viewName) => {
  let viewIndexed = false;

  do {
    try {
      await rpn.get({
        uri: `${environment.serverUrl}/${dbName}/${ddocId}/_view/${viewName}`,
        json: true,
        qs: { limit: 1 },
        timeout: 2000,
      });
      viewIndexed = true;
    } catch (requestError) {
      if (!requestError || !requestError.error || requestError.error.code !== SOCKET_TIMEOUT_ERROR_CODE) {
        throw requestError;
      }
    }
  } while (!viewIndexed);
};

/**
 * Updates json ddocs to add the :staged: ddoc name prefix
 * @param {Object<{ docs: Array<DesignDocument> }>} json
 * @return {Array<DesignDocument>}
 */
const getDdocsToStageFromJson = (ddocs, deployInfo) => {
  if (!ddocs.length) {
    return [];
  }

  return ddocs.map(ddoc => {
    ddoc._id = ddoc._id.replace(DDOC_PREFIX, STAGED_DDOC_PREFIX);
    ddoc.deploy_info = deployInfo;
    return ddoc;
  });
};

/**
 * Returns an array of functions that, when called, start indexing all views of staged ddocs
 * and return view indexing promises
 * @return {Promise<[function]>}
 */
const getViewsToIndex = async () => {
  const viewsToIndex = [];

  for (const database of DATABASES) {
    const stagedDdocs = await getStagedDdocs(database);
    stagedDdocs.forEach(ddoc => {
      if (!ddoc.views || !_.isObject(ddoc.views)) {
        return;
      }

      const ddocViewIndexPromises = Object
        .keys(ddoc.views)
        .map(viewName => indexView.bind({}, database.name, ddoc._id, viewName));
      viewsToIndex.push(...ddocViewIndexPromises);
    });
  }
  return viewsToIndex;
};

const abortPreviousUpgrade = async () => {
  try {
    await upgradeLogService.setAborted();
  } catch (err) {
    logger.warn('Error aborting previous upgrade: %o', err);
  }
};

/**
 * Creates the upgrade folder. This folder will contain the ddoc definitions for the new version, along with
 * the json contents of the upgrade log doc that tracks upgrade progress.
 * If the staging folder already exists, the previous upgrade is aborted and the folder is re-created.
 * @return {Promise}
 */
const createUpgradeFolder = async () => {
  await deleteUpgradeFolder(true);
  try {
    await fs.promises.mkdir(environment.upgradePath);
  } catch (err) {
    logger.error('Error while trying to create the staged ddoc folder');
    throw err;
  }
};

const deleteUpgradeFolder = async (abort) => {
  try {
    await fs.promises.access(environment.upgradePath);
    abort && await abortPreviousUpgrade();

    // todo change the contents of this function once we don't support node > 12
    // fs.promises.rmdir(environment.upgradePath, { recursive: true });
    const files = await fs.promises.readdir(environment.upgradePath);
    for (const file of files) {
      await fs.promises.unlink(path.join(environment.upgradePath, file));
    }
    await fs.promises.rmdir(environment.upgradePath);
  } catch (err) {
    // if folder doesn't exist, this is fine!
    if (err.code !== FILE_NOT_FOUND_ERROR_CODE) {
      logger.error('Error while deleting staged ddoc folder');
      throw err;
    }
  }
};

const getStagingDdoc = async (version) => {
  const stagingDocId = `${BUILD_DOC_PREFIX}${version}`;
  try {
    const stagingDoc = await db.builds.get(stagingDocId, { attachments: true });
    if (!stagingDoc._attachments || !_.isObject(stagingDoc._attachments)) {
      throw new Error('Staging ddoc is missing attachments');
    }
    return stagingDoc;
  } catch (err) {
    logger.error(`Error while getting the staging doc for version ${version}`);
    throw err;
  }
};

/**
 * For a given version, downloads the staging document and saves all ddoc attachments in the staging folder.
 * @param version
 * @return {Promise}
 */
const downloadDdocDefinitions = async (version) => {
  const stagingDoc = await getStagingDdoc(version);
  // for simplicity, we're only pre-installing and warming "known" databases.
  // for new databases, the final install will happen in the api preflight check.
  // since any new database will be empty, the impact of not warming views is minimal.
  for (const database of DATABASES) {
    const attachment = stagingDoc._attachments[`ddocs/${database.jsonFileName}`];
    // a missing attachment means that the database is dropped in this version.
    // a migration should remove the unnecessary database.
    if (attachment) {
      const stagingDdocPath = path.join(environment.upgradePath, database.jsonFileName);
      await fs.promises.writeFile(stagingDdocPath, attachment.data, 'base64');
    } else {
      logger.warn(`Attachment for ${database.name} was not found. Skipping.`);
    }
  }
};

const getDdocJsonContents = async (path) => {
  try {
    const contents = await fs.promises.readFile(path, 'utf-8');
    return JSON.parse(contents);
  } catch (err) {
    if (err.code !== FILE_NOT_FOUND_ERROR_CODE) {
      throw err;
    }
  }
};

const getBundledDdocs = async (database, version = PACKAGED_VERSION) => {
  const ddocsFolderPath = version === PACKAGED_VERSION ? environment.ddocsPath : environment.upgradePath;
  const ddocJson = await getDdocJsonContents(path.join(ddocsFolderPath, database.jsonFileName));
  return ddocJson && ddocJson.docs || [];
};

const freshInstall = async () => {
  try {
    await db.medic.get(getDdocId(environment.ddoc));
    return false;
  } catch (err) {
    if (err.status === 404) {
      return true;
    }
    throw err;
  }
};

const saveStagedDdocs = async (version) => {
  const deployInfo = await upgradeLogService.getDeployInfo();
  for (const database of DATABASES) {
    const bundledDdocs = await getBundledDdocs(database, version);
    const ddocsToStage = getDdocsToStageFromJson(bundledDdocs, deployInfo);

    logger.info(`Saving ddocs for ${database.name}`);
    await saveDocs(database, ddocsToStage);
  }
};

const indexViews = async (viewsToIndex) => {
  if (!Array.isArray(viewsToIndex)) {
    await upgradeLogService.setIndexed();
    return;
  }

  await upgradeLogService.setIndexing();
  const indexResult = await Promise.all(viewsToIndex.map(indexView => indexView()));
  await upgradeLogService.setIndexed();

  return indexResult;
};

/**
 * Renames staged ddocs to remove the :staged: prefix and overwrites existent ddocs, assigns deploy info pre-save.
 * Does not remove "extra" ddocs (that existed in the previous version, but don't exist in the new version).
 * Those will have to be removed with a migration (as with databases).
 */
const unstageStagedDdocs = async () => {
  const deployTime = new Date().getTime();
  for (const database of DATABASES) {
    const ddocs = await getDdocs(database, true);
    const ddocsToSave = [];

    for (const ddoc of ddocs) {
      if (!isStagedDdoc(ddoc._id)) {
        continue;
      }

      const ddocId = ddoc._id.replace(STAGED_DDOC_PREFIX, DDOC_PREFIX);

      const ddocToReplace = ddocs.find(existentDdoc => ddocId === existentDdoc._id);
      if (ddocToReplace) {
        ddoc._rev = ddocToReplace._rev;
      } else {
        delete ddoc._rev;
      }

      ddoc._id = ddocId;
      ddoc.deploy_info = ddoc.deploy_info || {};
      ddoc.deploy_info.timestamp = deployTime;

      ddocsToSave.push(ddoc);
    }

    await saveDocs(database, ddocsToSave);
  }
};

const getDdocName = ddocId => ddocId.replace(STAGED_DDOC_PREFIX, '').replace(DDOC_PREFIX, '');
const getDdocId = ddocName => `${DDOC_PREFIX}${ddocName}`;

/**
 * Compares a list of bundled ddocs with a list of uploaded ddocs.
 * Returns a list of missing ddocs ids and a list of different ddocs ids.
 * A ddoc is missing if it is bundled and not uploaded.
 * A ddoc is different the version of the bundled ddoc is different from the version of the uploaded ddoc.
 * @param {Array<{ _id, version: string }>} bundled Array of bundled ddocs
 * @param {Array<{ _id, version: string }>} uploaded Array of uploaded ddocs
 * @return {{missing: Array<string>, different: Array<string>}}
 */
const compareDdocs = (bundled, uploaded) => {
  const missing = [];
  const different = [];

  const findCorrespondingDdoc = (ddocA, ddocsB) => {
    const ddocAName = getDdocName(ddocA._id);
    return ddocsB.find(ddocB => getDdocName(ddocB._id) === ddocAName);
  };

  bundled.forEach(bundledDdoc => {
    const uploadedDdoc = findCorrespondingDdoc(bundledDdoc, uploaded);
    if (!uploadedDdoc) {
      missing.push(bundledDdoc._id);
      return;
    }

    if (bundledDdoc.version !== uploadedDdoc.version) {
      different.push(bundledDdoc._id);
    }
  });

  return { missing, different };
};

module.exports = {
  DATABASES,
  PACKAGED_VERSION,

  cleanup,

  getDdocs,
  isStagedDdoc,
  compareDdocs,
  getDdocId,
  createUpgradeFolder,
  getPackagedVersion,
  downloadDdocDefinitions,
  freshInstall,
  deleteStagedDdocs,
  saveStagedDdocs,
  getViewsToIndex,
  indexViews,
  unstageStagedDdocs,
  getBundledDdocs,
  deleteUpgradeFolder,
};
