const rpn = require('request-promise-native');
const fs = require('fs');
const path = require('path');

const db = require('../../db');
const logger = require('../../logger');
const environment = require('../../environment');

const LOCAL_VERSION = 'local';
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
 * @property {Boolean} index
 */

/**
 * @type {Array<Database>}
 */
const DATABASES = [
  {
    name: environment.db,
    db: db.medic,
    jsonFileName: 'medic.json',
    index: true,
  },
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
  }
];

const isStagedDdoc = ddocId => ddocId.startsWith(STAGED_DDOC_PREFIX);

/**
 * @param {Database} database
 * @param {Array<DesignDocument>} docs
 * @return {Promise}
 */
const deleteDocs = (database, docs) => {
  if (!docs.length) {
    return Promise.resolve();
  }
  docs.forEach(doc => doc._deleted = true);
  return saveDocs(database, docs);
};

/**
 * @param {Database} database
 * @param {Array<string>} docIds
 * @return {Promise<Array<DesignDocument>>}
 */
const getDocs = async (database, docIds) => {
  const result = await database.db.allDocs({ keys: docIds, include_docs: true });
  return result.rows.map(row => row.doc);
};

/**
 * @param {Database} database
 * @param {Array<DesignDocument>} docs
 * @return {Promise}
 */
const saveDocs = async (database , docs) => {
  const results = await database.db.bulkDocs(docs);
  const errors = results.map(result => result.error).filter(error => error);
  if (!errors.length) {
    return results;
  }

  throw new Error(`Error while saving docs ${JSON.stringify(errors)}`);
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
    logger.info(`Running view cleanup for ${database.name}`);
  }
};

/**
 * Runs compaction and view cleanup for every database.
 * @return {Promise}
 */
const cleanup = async () => {
  const deferredJobs = [];
  for (const database of DATABASES) {
    const stagedDdocs = await getStagedDdocs(database);
    await deleteDocs(database, stagedDdocs);
    logger.info(`Running DB compact and cleanup for ${database.name}`);
    // todo maybe only run viewCleanup and keep compaction separate? or not run compaction at all?
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
const indexView = (dbName, ddocId, viewName) => {
  // todo change this to do while for memory management
  return rpn
    .get({
      uri: `${environment.serverUrl}/${dbName}/${ddocId}/_view/${viewName}`,
      json: true,
      qs: { limit: 1 },
      timeout: 2000,
    })
    .catch(requestError => {
      if (requestError && requestError.error && requestError.error.code === SOCKET_TIMEOUT_ERROR_CODE) {
        return indexView(dbName, ddocId, viewName);
      }
      throw requestError;
    });
  // todo also retry when getting a result?
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
const getViewsToIndex = async (database, ddocsToStage) => {
  const viewsToIndex = [];

  if (!database.index) {
    return viewsToIndex;
  }

  const ddocs = await getDocs(database, ddocsToStage.map(doc => doc._id));
  ddocs.forEach(ddoc => {
    const ddocViewIndexPromises = Object
      .keys(ddoc.views)
      .map(viewName => indexView.bind({}, database.name, ddoc._id, viewName));
    viewsToIndex.push(...ddocViewIndexPromises);
  });

  return viewsToIndex;
};

const createDdocsStagingFolder = async () => {
  try {
    await fs.promises.access(environment.stagedDdocsPath);
    await fs.promises.rmdir(environment.stagedDdocsPath, { recursive: true });
  } catch (err) {
    // if folder doesn't exist, do nothing
  }

  await fs.promises.mkdir(environment.stagedDdocsPath);
};

/**
 * For a given version, reads ddocs that are attached to the staging document and saves them in a staged ddocs folder.
 * @param version
 * @return {Promise}
 */
const getDdocsToStageForVersion = async (version) => {
  if (version === LOCAL_VERSION) {
    return;
  }

  await createDdocsStagingFolder();

  const docId = `${BUILD_DOC_PREFIX}${version}`;
  const doc = await db.builds.get(docId, { attachments: true });

  for (const database of DATABASES) {
    const attachment = doc._attachments[`ddocs/${database.jsonFileName}`];
    if (!attachment) {
      // throw error ?
      continue;
    }

    const stagingDdocPath = path.join(environment.stagedDdocsPath, database.jsonFileName);
    await fs.promises.writeFile(stagingDdocPath, attachment.data, 'base64');
  }
};

const getDdocsToStage = (database, version) => {
  const ddocsFolderPath = version === LOCAL_VERSION ? environment.ddocsPath : environment.stagedDdocsPath;
  const json = require(path.join(ddocsFolderPath, database.jsonFileName));
  return getDdocsToStageFromJson(json);
};

/**
 * For a given version:
 * - downloads ddoc definitions from the staging server
 * - creates all staged ddocs (all databases)
 * - returns a function that, when called, starts indexing every view from every database
 * @param {string} version
 * @return {Promise<function(): Promise>}
 */
const stage = async (version = 'local') => {
  logger.info(`Staging ${version}`);
  await getDdocsToStageForVersion(version);

  const viewsToIndex = [];

  await deleteStagedDdocs();

  for (const database of DATABASES) {
    const ddocsToStage = getDdocsToStage(database, version);
    logger.info(`Saving ddocs for ${database.name}`);
    await saveDocs(database, ddocsToStage);
    viewsToIndex.push(...await getViewsToIndex(database, ddocsToStage));
  }

  const indexViews = () => {
    logger.info('Indexing staged views');
    return Promise.all(viewsToIndex.map(indexView => indexView()));
  };

  logger.info('Staging complete');
  return indexViews;
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
 * Wipes staging folder, assigns deploy info do staged ddocs, renames staged ddocs to their prod names.
 * @return {Promise}
 */
const complete = async () => {
  logger.info('Completing install');

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

  logger.info('Install complete');
};

const getDdocName = ddocId => ddocId.replace(STAGED_DDOC_PREFIX, '').replace(DDOC_PREFIX, '');

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

  // todo How strict to be here? also compare uploaded to bundled? Delete "extra" ddocs when completing upgrade?
  // is an install invalid if we have extra ddocs?

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
};
