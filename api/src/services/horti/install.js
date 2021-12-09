const path = require('path');

const environment = require('../../environment');
const upgradeUtils = require('./utils');
const viewIndexerProgress = require('./indexer-progress');
const logger = require('../../logger');

const getBundledDdocs = (jsonFileName) => {
  return require(path.join(environment.ddocsPath, jsonFileName)).docs;
};

const completeInstall = async () => {
  await upgradeUtils.complete();
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
const checkInstall = async () => {
  const ddocValidation = {};

  for (const database of upgradeUtils.DATABASES) {
    ddocValidation[database.name] = {};

    const allDdocs = await upgradeUtils.getDdocs(database, true);

    const liveDdocs = allDdocs.filter(ddoc => !upgradeUtils.isStagedDdoc(ddoc._id));
    const stagedDdocs = allDdocs.filter(ddoc => upgradeUtils.isStagedDdoc(ddoc._id));
    const bundledDdocs = getBundledDdocs(database.jsonFileName);

    let { missing , different } = upgradeUtils.compareDdocs(bundledDdocs, liveDdocs);
    ddocValidation[database.name].missing = missing;
    ddocValidation[database.name].different = different;

    if (missing.length || different.length) {
      ({ missing, different } = upgradeUtils.compareDdocs(bundledDdocs, stagedDdocs));
      ddocValidation[database.name].stagedUpgrade = !missing.length && !different.length;
    } else {
      ddocValidation[database.name].valid = true;
    }
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
    return completeInstall();
  }

  logDdocCheck(ddocValidation);
  logger.info('Installation invalid. Staging install');
  const indexViews = await upgradeUtils.stage();
  const stopQueryingIndexers = viewIndexerProgress.log();
  await indexViews();
  stopQueryingIndexers();

  return completeInstall();
};

const logDdocCheck = (ddocValidation) => {
  const missing = [];
  const different = [];

  for (const database of upgradeUtils.DATABASES) {
    missing.push(...ddocValidation[database.name].missing.map(ddocId => `${database.name}/${ddocId}`));
    different.push(...ddocValidation[database.name].different.map(ddocId => `${database.name}/${ddocId}`));
  }

  logger.debug(`Found missing ddocs: ${missing.length ? missing : 'none'}`);
  logger.debug(`Found different ddocs: ${different.length ? different: 'none'}`);
};

module.exports = {
  checkInstall,
};
