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
  const medicDdocs = await getDdocJsonContents(path.join(environment.ddocsPath, MEDIC_DATABASE.jsonFileName));
  const medicDdocId = getDdocId(environment.ddoc);
  const medicDdoc = medicDdocs.docs.find(ddoc => ddoc._id === medicDdocId);
  return medicDdoc.version;
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

  throw new Error(`Error while saving docs: ${JSON.stringify(errors)}`);
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
 * @return {Promise}
 */
const cleanup = async () => {
  const deferredJobs = [];
  for (const database of DATABASES) {
    logger.info(`Running DB compact and view cleanup for ${database.name}`);
    deferredJobs.push(database.db.compact(), database.db.viewCleanup());
  }

  return Promise.all(deferredJobs);
};

/**
 * @param {Database} database
 * @return {Promise<Array<DesignDocument>>}
 */
const getStagedDdocs = async (database) => {
  const result = await database.db.allDocs({ startkey: STAGED_DDOC_PREFIX, endkey: `${STAGED_DDOC_PREFIX}\ufff0` });
  return result.rows.map(row => ({ _id: row.id, _rev: row.value.rev }));
};

/**
 * @param {Database} database
 * @param {Boolean} includeDocs
 * @return {Promise<Array<DesignDocument>>}
 */
const getDdocs = async (database, includeDocs = false) => {
  const opts = { startkey: DDOC_PREFIX, endkey: `${DDOC_PREFIX}\ufff0`, include_docs: includeDocs };
  const result = await database.db.allDocs(opts);
  return result.rows.map(row => row.doc || { _id: row.id, _rev: row.value.rev });
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
const getDdocsToStageFromJson = (json) => {
  return json.docs.map(ddoc => {
    ddoc._id = ddoc._id.replace(DDOC_PREFIX, STAGED_DDOC_PREFIX);
    return ddoc;
  });
};

/**
 * Returns an array of functions that, when called, start indexing all staged views and return view indexing promises
 * @param {Database} database
 * @param {Array<DesignDocument>} ddocsToStage
 * @return {Promise<[function]>}
 */
const getViewsToIndex = async (database, ddocs) => {
  const viewsToIndex = [];

  ddocs.forEach(ddoc => {
    if (!ddoc.views || !_.isObject(ddoc.views)) {
      return;
    }

    const ddocViewIndexPromises = Object
      .keys(ddoc.views)
      .map(viewName => indexView.bind({}, database.name, ddoc._id, viewName));
    viewsToIndex.push(...ddocViewIndexPromises);
  });

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
  try {
    await fs.promises.access(environment.upgradePath);

    await abortPreviousUpgrade();
    await deleteUpgradeFolder();
  } catch (err) {
    // if folder doesn't exist, this is fine!
    if (err.code !== 'ENOENT') {
      logger.error('Error while deleting staged ddoc folder');
      throw err;
    }
  }

  try {
    await fs.promises.mkdir(environment.upgradePath);
  } catch (err) {
    logger.error('Error while trying to create the staged ddoc folder');
    throw err;
  }
};
const deleteUpgradeFolder = async () => {
  // todo change the contents of this function to just the next line once we don't support node > 12
  // fs.promises.rmdir(environment.upgradePath, { recursive: true });

  const files = await fs.promises.readdir(environment.upgradePath);
  for (const file of files) {
    await fs.promises.unlink(path.join(environment.upgradePath, file));
  }
  await fs.promises.rmdir(environment.upgradePath);
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
  const contents = await fs.promises.readFile(path, 'utf-8');
  return JSON.parse(contents);
};

const getDdocsToStage = async (database, version) => {
  const ddocsFolderPath = version === PACKAGED_VERSION ? environment.ddocsPath : environment.upgradePath;
  const ddocJson = await getDdocJsonContents(path.join(ddocsFolderPath, database.jsonFileName));
  return getDdocsToStageFromJson(ddocJson);
};

const freshInstall = async () => {
  try {
    await db.medic.get(getDdocId(environment.ddoc));
  } catch (err) {
    if (err.status === 404) {
      return true;
    }
  }
};

const saveStagedDdocs = async (version) => {
  const viewsToIndex = [];

  for (const database of DATABASES) {
    const ddocsToStage = await getDdocsToStage(database, version);
    logger.info(`Saving ddocs for ${database.name}`);
    await saveDocs(database, ddocsToStage);
    viewsToIndex.push(...await getViewsToIndex(database, ddocsToStage));
  }

  return viewsToIndex;
};

const getIndexViewsFunction = async (viewsToIndex) => {
  return async () => {
    await upgradeLogService.setIndexing();
    const indexResult = await Promise.all(viewsToIndex.map(indexView => indexView()));
    await upgradeLogService.setIndexed();

    return indexResult;
  };
};

/**
 * For a given version:
 * - downloads ddoc definitions from the staging server
 * - creates all staged ddocs (all databases)
 * - returns a function that, when called, starts indexing every view from every database
 * @param {string} version
 * @param {string} username
 * @return {Promise<function(): Promise>}
 */
const stage = async (version = PACKAGED_VERSION, username= '') => {
  if (!version || typeof version !== 'string') {
    throw new Error(`Invalid version: ${version}`);
  }

  if (version !== PACKAGED_VERSION) {
    await createUpgradeFolder();
    const currentVersion = await getPackagedVersion();
    await upgradeLogService.create(version, currentVersion, username);
    await downloadDdocDefinitions(version);
  }

  if (await freshInstall()) {
    await createUpgradeFolder();
    const currentVersion = await getPackagedVersion();
    await upgradeLogService.create(currentVersion);
  }

  // delete old staged ddocs only after trying to get the staging doc for the version, and fail early
  await deleteStagedDdocs();

  const viewsToIndex = await saveStagedDdocs(version);
  await upgradeLogService.setStaged();

  return getIndexViewsFunction(viewsToIndex);
};

const assignDeployInfo = (stagedDdocs) => {
  const medicDdoc = stagedDdocs.find(ddoc => ddoc._id === `${STAGED_DDOC_PREFIX}medic`);
  const medicClientDdoc = stagedDdocs.find(ddoc => ddoc._id === `${STAGED_DDOC_PREFIX}medic-client`);

  const deployInfo = {
    timestamp: new Date().getTime(),
    user: 'user', // todo previously we saved the couchdb user that initiated the upgrade in the horti-upgrade doc
    version: medicDdoc && medicDdoc.build_info && medicDdoc.build_info.version,
  };
  medicDdoc.deploy_info = deployInfo;
  medicClientDdoc.deploy_info = deployInfo;
};

/**
 * Completes the installation
 * Assigns deploy info do staged ddocs, renames staged ddocs to their prod names, sets upgrade log to complete.
 * @return {Promise}
 */
const complete = async () => {
  await upgradeLogService.setCompleting();

  for (const database of DATABASES) {
    const ddocs = await getDdocs(database, true);
    const ddocsToSave = [];

    if (database.name === environment.db) {
      assignDeployInfo(ddocs);
    }

    for (const ddoc of ddocs) {
      if (!isStagedDdoc(ddoc._id)) {
        continue;
      }

      const ddocId = ddoc._id.replace(STAGED_DDOC_PREFIX, DDOC_PREFIX);
      const ddocToReplace = ddocs.find(existentDdoc => ddocId === existentDdoc._id);
      ddoc._id = ddocId;

      if (ddocToReplace) {
        ddoc._rev = ddocToReplace._rev;
      } else {
        delete ddoc._rev;
      }

      ddocsToSave.push(ddoc);
    }

    await saveDocs(database, ddocsToSave);
  }

  await deleteStagedDdocs();
  await upgradeLogService.setComplete();
  await deleteUpgradeFolder();
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
      different.push(uploadedDdoc._id);
    }
  });

  return { missing, different };
};

module.exports = {
  DATABASES,

  cleanup,
  stage,
  complete,

  getDdocs,
  isStagedDdoc,
  compareDdocs,
  getDdocId,
};
