const upgradeUtils = require('./utils');
const viewIndexerProgress = require('./view-indexer-progress');
const upgradeLogService = require('./upgrade-log');
const viewIndexer = require('./view-indexer');

/**
 * Completes the installation:
 * - assigns deploy info do staged ddocs
 * - renames staged ddocs to their prod names
 * - sets upgrade log to complete.
 * - runs view cleanup and compaction
 * @return {Promise}
 */
const complete = async () => {
  await upgradeLogService.setCompleting();
  await upgradeUtils.unstageStagedDdocs();
  await upgradeUtils.deleteStagedDdocs();
  await upgradeLogService.setComplete();
  await upgradeUtils.cleanup();
};

/**
 * Aborts the current installation:
 * - deletes stated ddocs
 * - deletes the upgrade folder
 * - set log to aborted state
 * @return {Promise}
 */
const abort = async () => {
  await upgradeUtils.deleteStagedDdocs();
  await upgradeUtils.abortPreviousUpgrade();
  await upgradeUtils.cleanup();
};

/**
 * Checks whether currently installed ddocs are the same as the bundled ddocs
 * If they are, does nothing
 * If comparison between bundled ddocs and uploaded ddocs fails, it compares staged ddocs with bundled ddocs.
 * If comparison between bundled ddocs and staged ddocs succeeds, it renames staged ddocs to overwrite uploaded ddocs.
 * If comparison between bundled ddocs and staged ddocs fails, it stqges the bundled ddocs and begins an install
 * @return {Promise}
 */
/**
 * For a given version:
 * - wipes and recreates the upgrade folder
 * - creates the upgrade log file and doc to track the upgrade
 *
 * For local version, when not on an initial installation, does nothing.
 * @param {string} version - semver version, defaults to local
 * @param {string} username - user which initiated the upgrade
 * @param {Boolean} stageOnly
 * @return {Promise}
 */
const prep = async (version = upgradeUtils.PACKAGED_VERSION, username, stageOnly = true) => {
  if (!version || typeof version !== 'string') {
    throw new Error(`Invalid version: ${version}`);
  }

  if (version === upgradeUtils.PACKAGED_VERSION && !await upgradeUtils.freshInstall()) {
    return;
  }

  await upgradeUtils.abortPreviousUpgrade();
  const packagedVersion = await upgradeUtils.getPackagedVersion();
  let action;
  if (version !== packagedVersion && version !== upgradeUtils.PACKAGED_VERSION) {
    action = stageOnly ? 'stage' : 'upgrade';
    await upgradeLogService.create(action, version, packagedVersion, username);
    return;
  }

  await upgradeLogService.create('install', packagedVersion);
};

/**
 * For a given version:
 * - downloads ddoc definitions from the staging server
 * - creates all staged ddocs (all databases)
 * - sets the upgrade log to stages state
 * @param {string} version
 * @return {Promise}
 */
const stage = async (version = upgradeUtils.PACKAGED_VERSION) => {
  if (!version || typeof version !== 'string') {
    throw new Error(`Invalid version: ${version}`);
  }

  await upgradeUtils.deleteStagedDdocs();

  const packagedVersion = await upgradeUtils.getPackagedVersion();
  const ddocs = await upgradeUtils.downloadDdocDefinitions(version, packagedVersion);

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
  complete,
  abort,
};
