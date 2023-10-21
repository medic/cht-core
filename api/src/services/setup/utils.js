const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const rpn = require('request-promise-native');

const db = require('../../db');
const logger = require('../../logger');
const environment = require('../../environment');
const upgradeLogService = require('./upgrade-log');
const { DATABASES, MEDIC_DATABASE } = require('./databases');
const ddocsService = require('./ddocs');

const UPGRADE_SERVICE_URL = process.env.UPGRADE_SERVICE_URL || 'http://localhost:5008';

/**
 * Returns version of bundled medic/medic ddoc
 * @return {Promise<string>}
 */
const getPackagedBuildInfo = async () => {
  try {
    const medicDdocs = await getDdocJsonContents(path.join(environment.ddocsPath, MEDIC_DATABASE.jsonFileName));
    if (!medicDdocs || !medicDdocs.docs) {
      throw new Error('Cannot find medic db ddocs among packaged ddocs.');
    }
    const medicDdoc = medicDdocs.docs.find(ddoc => ddoc._id === ddocsService.getId(environment.ddoc));
    if (!medicDdoc) {
      throw new Error('Cannot find medic ddoc among packaged ddocs.');
    }
    return medicDdoc.build_info;
  } catch (err) {
    logger.error('Error when trying to determine packaged version: %o', err);
    throw err;
  }
};

/**
 * Deletes uploaded staged ddocs
 * @return {Promise}
 */
const deleteStagedDdocs = async () => {
  logger.info('Deleting existent staged ddocs');
  for (const database of DATABASES) {
    const stagedDdocs = await ddocsService.getStagedDdocs(database);
    if (stagedDdocs.length) {
      stagedDdocs.forEach(doc => doc._deleted = true);
      await db.saveDocs(database.db, stagedDdocs);
    }
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
 * Updates json ddocs to add the :staged: ddoc name prefix
 * @param {Object<{ docs: Array<DesignDocument> }>} json
 * @return {Array<DesignDocument>}
 */
const setStagingData = (ddocs, deployInfo) => {
  if (!ddocs || !ddocs.length) {
    return [];
  }

  ddocs.forEach(ddoc => {
    ddoc._id = ddocsService.stageId(ddoc._id);
    ddoc.deploy_info = deployInfo;
    delete ddoc._rev;
  });

  return ddocs;
};

const abortPreviousUpgrade = async () => {
  try {
    await upgradeLogService.setAborted();
  } catch (err) {
    logger.warn('Error aborting previous upgrade: %o', err);
  }
};

const interruptPreviousUpgrade = async () => {
  try {
    const upgradeLog = await upgradeLogService.get();
    if (!upgradeLog) {
      return;
    }

    if (upgradeLog.state === upgradeLogService.states.COMPLETING) {
      // don't interrupt if we're completing the upgrade
      return;
    }

    if (
      upgradeLog.action === upgradeLogService.actions.STAGE &&
      upgradeLog.state === upgradeLogService.states.INDEXED
    ) {
      // don't interrupt when we're only staging and views are already indexed
      return;
    }

    await upgradeLogService.setInterrupted();
  } catch (err) {
    logger.error('Error while setting previous upgrade as interrupted %o', err);
  }
};

/**
 * Checks whether the passed build info is valid.
 * A falsy build info means we're installing the bundled version.
 * Build infos require 3 properties: application, namespace and version, all needing to be strings, for example:
 * { namespace: 'medic', application: 'medic', version: '4.0.0' }
 * @param {BuildInfo|undefined} buildInfo
 * @return {boolean}
 */
const validBuildInfo = (buildInfo) => {
  if (!buildInfo) {
    return true;
  }

  const requireFields = ['application', 'namespace', 'version'];
  return !!buildInfo &&
         _.isObject(buildInfo) &&
         requireFields.every(field => buildInfo[field] && typeof buildInfo[field] === 'string');
};

/**
 * @param {BuildInfo} buildInfo
 * @return {Promise}
 */
const getStagingDoc = async (buildInfo) => {
  const stagingDocId = `${buildInfo.namespace}:${buildInfo.application}:${buildInfo.version}`;
  try {
    const stagingDoc = await db.builds.get(stagingDocId, { attachments: true });
    if (_.isEmpty(stagingDoc._attachments)) {
      throw new Error('Staging ddoc is missing attachments');
    }
    return stagingDoc;
  } catch (err) {
    logger.error(`Error while getting the staging doc for version ${buildInfo.version}`);
    throw err;
  }
};

const decodeAttachmentData = (data) => {
  try {
    const buffer = Buffer.from(data, 'base64');
    return JSON.parse(buffer.toString('utf-8'));
  } catch (err) {
    logger.error('Error while decoding attachment data');
    throw err;
  }
};


/**
 * For a local version, map of bundled ddoc definitions for every database
 * For an upgrade version, map of bundled ddoc definitions for every database, downloaded from the staging server
 * @param {BuildInfo|undefined} buildInfo
 * @return {Map<Database, Array>}
 */
const getDdocDefinitions = (buildInfo) => {
  if (!buildInfo) {
    return getLocalDdocDefinitions();
  }

  return downloadDdocDefinitions(buildInfo);
};

/**
 * Returns map of bundled ddoc definitions for every database
 * @return {Map<Database, Array>}
 */
const getLocalDdocDefinitions = async () => {
  const ddocDefinitions = new Map();
  for (const database of DATABASES) {
    ddocDefinitions.set(database, await getBundledDdocs(database));
  }
  return ddocDefinitions;
};

/**
 * Returns map of bundled ddoc definitions for every database, downloaded from the staging server
 * @param {BuildInfo} buildInfo
 * @return {Map<Database, Array>}
 */
const downloadDdocDefinitions = async (buildInfo) => {
  const ddocDefinitions = new Map();

  const stagingDoc = await getStagingDoc(buildInfo);

  // for simplicity, only ddocs for "known" databases are staged and indexed.
  // for new databases, the final install will happen in the api preflight check.
  // since any new database will be empty, the impact of not warming views is minimal.
  for (const database of DATABASES) {
    const attachment = stagingDoc._attachments[`ddocs/${database.jsonFileName}`];
    // a missing attachment means that the database is dropped in this version.
    // a migration should remove the unnecessary database.
    if (attachment) {
      const json = decodeAttachmentData(attachment.data);
      ddocDefinitions.set(database, getDdocsFromJson(json));
    } else {
      logger.warn(`Attachment for ${database.jsonFileName} was not found. Skipping.`);
    }
  }

  return ddocDefinitions;
};

const getDdocJsonContents = async (path) => {
  const contents = await fs.promises.readFile(path, 'utf-8');
  return JSON.parse(contents);
};

const getDdocsFromJson = (json) => (json && json.docs) || [];

const getBundledDdocs = async (database) => {
  try {
    const ddocJson = await getDdocJsonContents(path.join(environment.ddocsPath, database.jsonFileName));
    return getDdocsFromJson(ddocJson);
  } catch (err) {
    logger.error('Error when trying to parse ddoc json contents: %o', err);
    throw err;
  }
};

const freshInstall = async () => {
  try {
    await db.medic.get(ddocsService.getId(environment.ddoc));
    return false;
  } catch (err) {
    if (err.status === 404) {
      return true;
    }
    throw err;
  }
};

/**
 *
 * @param {Map<Database, [DesignDocument]>} ddocDefinitions
 * @return {Promise}
 */
const saveStagedDdocs = async (ddocDefinitions) => {
  const deployInfo = await upgradeLogService.getDeployInfo();
  for (const database of DATABASES) {
    const ddocs = ddocDefinitions.get(database);
    const ddocsToStage = setStagingData(ddocs, deployInfo);

    logger.info(`Saving ddocs for ${database.name}`);
    await db.saveDocs(database.db, ddocsToStage);
  }
};

/**
 * Renames staged ddocs to remove the :staged: prefix and overwrites existent ddocs, assigns deploy info pre-save.
 * Does not remove "extra" ddocs (that existed in the previous version, but don't exist in the new version).
 * Those will have to be removed with a migration (as with databases).
 */
const unstageStagedDdocs = async () => {
  const deployTime = new Date().getTime();
  for (const database of DATABASES) {
    const ddocs = await ddocsService.getDdocs(database);
    const ddocsToSave = [];

    for (const ddoc of ddocs) {
      if (!ddocsService.isStaged(ddoc._id)) {
        continue;
      }

      const unstagedId = ddocsService.unstageId(ddoc._id);
      const ddocToReplace = ddocs.find(existentDdoc => unstagedId === existentDdoc._id);
      if (ddocToReplace) {
        ddoc._rev = ddocToReplace._rev;
      } else {
        delete ddoc._rev;
      }

      ddoc._id = unstagedId;
      ddoc.deploy_info = ddoc.deploy_info || {};
      ddoc.deploy_info.timestamp = deployTime;

      ddocsToSave.push(ddoc);
    }

    await db.saveDocs(database.db, ddocsToSave);
  }
};

const getUpgradeServicePayload = (stagingDoc) => {
  const dockerCompose = {};
  const attachmentPrefix = 'docker-compose/';

  Object
    .entries(stagingDoc._attachments)
    .filter(([name]) => name.startsWith(attachmentPrefix))
    .forEach(([name, contents]) => {
      const buffer = Buffer.from(contents.data, 'base64');
      const fileName = name.replace(attachmentPrefix, '');
      dockerCompose[fileName] = buffer.toString('utf-8');
    });

  const containers = stagingDoc.tags.map(tag => ({
    container_name: tag.container_name,
    image_tag: tag.image,
  }));

  return {
    containers,
    docker_compose: dockerCompose,
  };
};

const makeUpgradeRequest = async (payload) => {
  let url;
  try {
    url = new URL(UPGRADE_SERVICE_URL);
    url.pathname = '/upgrade';
  } catch (err) {
    throw new Error(`Invalid UPGRADE_SERVICE_URL: ${UPGRADE_SERVICE_URL}`);
  }

  const response = await rpn.post({ url: url.toString(), json: true, body: payload });
  const success = upgradeResponseSuccess(payload, response);
  if (!success) {
    logger.error('None of the docker-compose files or containers were updated: %o', response);
    logger.error('If deploying through docker-compose, please make sure that the CHT docker-compose files ' +
                 'that you wish to be updated match the naming convention.');
    logger.error('If deploying through kubernetes, please make sure the containers you wish to be upgraded ' +
                 'match the naming convention.');
    throw new Error('No containers were updated');
  }

  return response;
};

const upgradeResponseSuccess = (payload, response) => {
  if (!response) {
    return false;
  }

  const sucessfullyUpdatedFiles = Object
    .keys(payload.docker_compose)
    .filter(file => response[file] && response[file].ok);
  const successfullyUpdatedContainers = payload.containers
    .filter(({ container_name }) => response[container_name] && response[container_name].ok);

  return !!sucessfullyUpdatedFiles.length || !!successfullyUpdatedContainers.length;
};

module.exports = {
  cleanup,

  validBuildInfo,
  getPackagedBuildInfo,
  getDdocDefinitions,
  freshInstall,
  deleteStagedDdocs,
  saveStagedDdocs,
  unstageStagedDdocs,
  getBundledDdocs,
  abortPreviousUpgrade,
  interruptPreviousUpgrade,
  getStagingDoc,
  getUpgradeServicePayload,
  makeUpgradeRequest,
};
