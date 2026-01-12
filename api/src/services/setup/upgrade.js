const viewIndexerProgress = require('./view-indexer-progress');
const upgradeLog = require('./upgrade-log');
const upgradeSteps = require('./upgrade-steps');
const upgradeUtils = require('./utils');
const logger = require('@medic/logger');

/**
 * @typedef {Object} BuildInfo
 * @property {string} namespace - default "medic"
 * @property {string} application - default "medic"
 * @property {string} version - tag, branch or local
 * @property {string} build - unique tag for a build. Semver valid.
 */

/**
 * Initiates an upgrade.
 * Returns immediately after prep, because this is called by a user-initiated action that should get a quick response,
 * and starts the upgrade process outside the promise chain.
 * @param {BuildInfo} buildInfo
 * @param {string} username
 * @param {boolean} stageOnly
 * @return {Promise<void>}
 */
const upgrade = async (buildInfo, username, stageOnly) => {
  try {
    await upgradeSteps.prep(buildInfo, username, stageOnly);
    safeInstall(buildInfo, stageOnly);
  } catch (err) {
    await upgradeLog.setErrored();
    throw err;
  }
};

/**
 * @param {BuildInfo} buildInfo
 * @param {boolean} stageOnly
 * @return {Promise<void>}
 */
const safeInstall = async (buildInfo, stageOnly) => {
  try {
    await upgradeSteps.stage(buildInfo);
    await upgradeSteps.indexStagedViews();
    if (stageOnly) {
      return;
    }
    await complete(buildInfo);
  } catch (err) {
    await upgradeLog.setErrored();
    logger.error('Error thrown while installing: %o', err);
  }
};

/**
 * @param {BuildInfo} buildInfo
 * @return {Promise<void>}
 */
const complete = async (buildInfo) => {
  try {
    // this request, when actually performing an upgrade, would stop the container running API, and restart it using
    // the updated image. However, when upgrading to the "same" version, the request will just succeed
    const result = await upgradeSteps.complete(buildInfo);
    await upgradeSteps.finalize();
    return result;
  } catch (err) {
    await upgradeLog.setErrored();
    throw err;
  }
};

const abort = () => {
  return upgradeSteps.abort();
};

const indexerProgress = () => {
  return viewIndexerProgress.query();
};

const upgradeInProgress = () => {
  return upgradeLog.get();
};

const canUpgrade = () => upgradeUtils.isDockerUpgradeServiceRunning();

const compareBuildVersions = async (buildInfo) => {
  const remoteBuild = await upgradeUtils.downloadDdocDefinitions(buildInfo);
  const localBuild = await upgradeUtils.getLocalDdocDefinitions();

  const differences = [];

  for (const [database, localDdocs] of localBuild) {
    const remoteDdocs = remoteBuild.get(database);

    for (const localDdoc of localDdocs) {
      const remoteDdoc = remoteDdocs.find(ddoc => localDdoc._id === ddoc._id);
      if (!remoteDdoc) {
        differences.push({ type: 'remove', ddoc: localDdoc._id, db: database.name });
      } else if (areViewsDifferent(localDdoc, remoteDdoc)) {
        differences.push({ type: 'changed_views', ddoc: localDdoc._id, db: database.name });
      } else if (areIndexesDifferent(localDdoc, remoteDdoc)) {
        differences.push({ type: 'changed_indexes', ddoc: localDdoc._id, db: database.name });
      }

    }

    for (const remoteDdoc of remoteDdocs) {
      const localDdoc = localDdocs.find(ddoc => ddoc._id === remoteDdoc._id);
      if (!localDdoc) {
        differences.push({ type: 'add', ddoc: remoteDdoc._id, db: database.name });
      }
    }
  }

  return differences;
};

const areViewsDifferent = (local,  remote) => {
  if (!local.views && !remote.views) {
    return false;
  }

  if (!!local.views !== !!remote.views) {
    return true;
  }

  if (Object.keys(local.views).length !== Object.keys(remote.views).length) {
    return true;
  }

  for (const [viewName, localView] of Object.entries(local.views)) {
    const remoteView = remote.views[viewName];
    if (!remoteView || localView.map !== remoteView.map) {
      return true;
    }
  }
  return false;
};

const areIndexesDifferent = (local, remote) => {
  if (!local.nouveau && !remote.nouveau) {
    return false;
  }

  if (!!local.nouveau !== !!remote.nouveau) {
    return true;
  }

  if (Object.keys(local.nouveau).length !== Object.keys(remote.nouveau).length) {
    return true;
  }

  for (const [indexName, localIndex] of Object.entries(local.nouveau)) {
    const remoteIndex = remote.nouveau[indexName];
    if (!remoteIndex ||
        localIndex.index !== remoteIndex.index ||
        !isShallowEqual(localIndex.field_analyzers, remoteIndex.field_analyzers)
    ) {
      return true;
    }
  }
  return false;
};

const isShallowEqual = (obj1, obj2) => {
  if (!obj1 && !obj2) {
    return true;
  }

  if (!!obj1 !== !!obj2) {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  return keys1.length === keys2.length &&
         keys1.every(key => obj1[key] === obj2[key]);
};

module.exports = {
  canUpgrade,
  upgrade,
  complete,
  abort,
  upgradeInProgress,
  indexerProgress,
  compareBuildVersions,
};
