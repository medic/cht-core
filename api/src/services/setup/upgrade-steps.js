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
 * For a given version:
 * - set the previous upgrade_log doc to aborted state
 * - creates the upgrade_log doc to track the upgrade
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
    // partial installs don't require creating a new upgrade_log doc
    return;
  }

  await upgradeUtils.abortPreviousUpgrade();

  const packagedVersion = await upgradeUtils.getPackagedVersion();
  const upgradeToPackagedVersion = version === packagedVersion || version === upgradeUtils.PACKAGED_VERSION;

  if (upgradeToPackagedVersion) {
    await upgradeLogService.create('install', packagedVersion);
  } else {
    const action = stageOnly ? 'stage' : 'upgrade';
    await upgradeLogService.create(action, version, packagedVersion, username);
  }
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
