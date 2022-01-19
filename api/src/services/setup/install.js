const upgradeUtils = require('./utils');
const viewIndexerProgress = require('./indexer-progress');
const logger = require('../../logger');
const upgradeLogService = require('./upgrade-log');

/**
 * Completes the installation
 * Assigns deploy info do staged ddocs, renames staged ddocs to their prod names, sets upgrade log to complete.
 * @return {Promise}
 */
const complete = async () => {
  await upgradeLogService.setCompleting();
  await upgradeUtils.unstageStagedDdocs();
  await upgradeUtils.deleteStagedDdocs();
  await upgradeLogService.setComplete();
  await upgradeUtils.cleanup();
};

const checkInstallForDb = async (database) => {
  const check = {};
  const allDdocs = await upgradeUtils.getDdocs(database);
  const bundledDdocs = await upgradeUtils.getBundledDdocs(database);

  const liveDdocs = allDdocs.filter(ddoc => !upgradeUtils.isStagedDdoc(ddoc._id));
  const stagedDdocs = allDdocs.filter(ddoc => upgradeUtils.isStagedDdoc(ddoc._id));


  const liveDdocsCheck = upgradeUtils.compareDdocs(bundledDdocs, liveDdocs);
  check.missing = liveDdocsCheck.missing;
  check.different = liveDdocsCheck.different;

  if (check.missing.length || check.different.length) {
    const stagedDdocsCheck = upgradeUtils.compareDdocs(bundledDdocs, stagedDdocs);
    check.stagedUpgrade = !stagedDdocsCheck.missing.length && !stagedDdocsCheck.different.length;
    const allMissing = stagedDdocsCheck.missing.length === bundledDdocs.length;
    check.partialStagedUpgrade = !stagedDdocsCheck.different.length && !allMissing;
  } else {
    check.valid = true;
  }

  return check;
};

/**
 * Checks whether currently installed ddocs are the same as the bundled ddocs
 * If they are, does nothing
 * If comparison between bundled ddocs and uploaded ddocs fails, it compares staged ddocs with bundled ddocs.
 * If comparison between bundled ddocs and staged ddocs succeeds, it renames staged ddocs to overwrite uploaded ddocs.
 * If comparison between bundled ddocs and staged ddocs fails, it stqges the bundled ddocs and begins an install
 * @return {Promise}
 */
const checkInstall = async () => {
  const ddocValidation = {};

  for (const database of upgradeUtils.DATABASES) {
    ddocValidation[database.name] = await checkInstallForDb(database);
  }

  const allDbsValid = Object.values(ddocValidation).every(check => check.valid);
  if (allDbsValid) {
    logger.info('Installation valid');
    // todo poll views to start view warming anyway?
    // all good
    return;
  }

  const allDbsStaged = Object.values(ddocValidation).every(check => check.stagedUpgrade || check.valid);
  if (allDbsStaged) {
    logger.info('Staged installation valid. Completing install');
    return complete();
  }

  const someDbsStaged = Object.values(ddocValidation).every(check => check.partialStagedUpgrade || check.valid);
  if (someDbsStaged) {
    // this can happen if new databases exist in the new version
    logger.info('Partially staged installation. Continuing staging.');
  } else {
    logger.info('Installation invalid. Staging install');
  }

  logDdocCheck(ddocValidation);

  await stage();
  await indexStagedViews();
  await complete();
};

const logDdocCheck = (ddocValidation) => {
  const missing = [];
  const different = [];

  for (const database of upgradeUtils.DATABASES) {
    const checks = ddocValidation[database.name] || {};

    if (Array.isArray(checks.missing)){
      missing.push(...checks.missing.map(ddocId => `${database.name}/${ddocId}`));
    }
    if (Array.isArray(checks.different)) {
      different.push(...checks.different.map(ddocId => `${database.name}/${ddocId}`));
    }
  }

  logger.debug(`Found missing ddocs: ${missing.length ? missing : 'none'}`);
  logger.debug(`Found different ddocs: ${different.length ? different: 'none'}`);
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
const stage = async (version = upgradeUtils.PACKAGED_VERSION, username= '') => {
  if (!version || typeof version !== 'string') {
    throw new Error(`Invalid version: ${version}`);
  }
  const packagedVersion = await upgradeUtils.getPackagedVersion();

  if (version !== upgradeUtils.PACKAGED_VERSION && version !== packagedVersion) {
    await upgradeUtils.createUpgradeFolder();
    await upgradeLogService.create(version, packagedVersion, username);
    await upgradeUtils.downloadDdocDefinitions(version);
  } else if (await upgradeUtils.freshInstall()) {
    await upgradeUtils.createUpgradeFolder();
    await upgradeLogService.create(packagedVersion);
  }

  // delete old staged ddocs only after trying to get the staging doc for the version, and fail early
  await upgradeUtils.deleteStagedDdocs();

  await upgradeUtils.saveStagedDdocs(version);
  await upgradeLogService.setStaged();
};

const indexStagedViews = async () => {
  const viewsToIndex = await upgradeUtils.getViewsToIndex();
  const viewIndexingPromise = upgradeUtils.indexViews(viewsToIndex);
  const stopQueryingIndexers = viewIndexerProgress.log();
  await viewIndexingPromise;
  stopQueryingIndexers();
};

module.exports = {
  stage,
  indexStagedViews,
  complete,
  checkInstall,
};
