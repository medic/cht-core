const upgradeUtils = require('./utils');
const viewIndexerProgress = require('./view-indexer-progress');
const upgradeLogService = require('./upgrade-log');
const viewIndexer = require('./view-indexer');
const logger = require('../../logger');

/**
 * Finalizes the installation:
 * - assigns deploy info do staged ddocs
 * - renames staged ddocs to their prod names
 * - sets upgrade log to complete.
 * - runs view cleanup and compaction
 * @return {Promise}
 */
const finalize = async () => {
  await upgradeLogService.setFinalizing();
  await upgradeUtils.unstageStagedDdocs();
  await upgradeUtils.deleteStagedDdocs();
  await upgradeLogService.setFinalized();
  await upgradeUtils.cleanup();
};

/**
 * Cancels the current installation:
 * - deletes stated ddocs
 * - deletes the upgrade folder
 * - set log to cancelling and then cancelled state
 * @return {Promise}
 */
const abort = async () => {
  await upgradeLogService.setAborting();
  viewIndexer.stopIndexing();
  await upgradeUtils.deleteStagedDdocs();
  await upgradeLogService.setAborted();
  await upgradeUtils.cleanup();
};

/**
 * For a given version:
 * - set the previous upgrade_log doc to cancelled state
 * - creates the upgrade_log doc to track the upgrade
 *
 * For local version, when not on an initial installation, does nothing.
 * @param {BuildInfo|undefined} buildInfo - if undefined, installs local version
 * @param {string} username - user which initiated the upgrade
 * @param {Boolean} stageOnly
 * @return {Promise}
 */
const prep = async (buildInfo, username, stageOnly = true) => {
  if (!upgradeUtils.validBuildInfo(buildInfo)) {
    logger.error('Build info is invalid: %o', buildInfo);
    throw new Error(`Invalid build info`);
  }

  const packagedBuildInfo = await upgradeUtils.getPackagedBuildInfo();

  if (!buildInfo && !await upgradeUtils.freshInstall()) {
    // partial installs don't require creating a new upgrade_log doc
    return;
  }

  await upgradeUtils.abortPreviousUpgrade();

  if (!buildInfo) {
    await upgradeLogService.create(upgradeLogService.actions.INSTALL, packagedBuildInfo);
  } else {
    const action = stageOnly ? upgradeLogService.actions.STAGE : upgradeLogService.actions.UPGRADE;
    await upgradeLogService.create(action, buildInfo, packagedBuildInfo, username);
  }
};

/**
 * For a given version:
 * - downloads ddoc definitions from the staging server
 * - creates all staged ddocs (all databases)
 * - sets the upgrade log to stages state
 * @param {BuildInfo|undefined} buildInfo
 * @return {Promise}
 */
const stage = async (buildInfo) => {
  if (!upgradeUtils.validBuildInfo(buildInfo)) {
    logger.error('Build info is invalid: %o', buildInfo);
    throw new Error(`Invalid build info`);
  }

  await upgradeUtils.deleteStagedDdocs();

  const ddocs = await upgradeUtils.getDdocDefinitions(buildInfo);

  await upgradeUtils.saveStagedDdocs(ddocs);
  await upgradeLogService.setStaged();
};

/**
 * Indexes staged views, querying and logging view indexer progress until view indexing is complete.
 * @return {Promise}
 */
const indexStagedViews = async () => {
  const viewsToIndex = await viewIndexer.getViewsToIndex();
  const viewIndexingPromise = viewIndexer.indexViews(viewsToIndex);
  const stopQueryingIndexers = viewIndexerProgress.log();
  await viewIndexingPromise;
  stopQueryingIndexers();
};

module.exports = {
  prep,
  stage,
  indexStagedViews,
  finalize,
  abort,
};
