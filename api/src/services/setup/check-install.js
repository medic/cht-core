const logger = require('../../logger');
const upgradeUtils = require('./utils');
const upgradeSteps = require('./upgrade-steps');
const ddocsService = require('./ddocs');
const { DATABASES } = require('./databases');


const checkInstallForDb = async (database) => {
  const check = {};
  const allDdocs = await ddocsService.getDdocs(database);
  const bundledDdocs = await upgradeUtils.getBundledDdocs(database);

  const liveDdocs = allDdocs.filter(ddoc => !ddocsService.isStaged(ddoc._id));
  const stagedDdocs = allDdocs.filter(ddoc => ddocsService.isStaged(ddoc._id));


  const liveDdocsCheck = ddocsService.compareDdocs(bundledDdocs, liveDdocs);
  check.missing = liveDdocsCheck.missing;
  check.different = liveDdocsCheck.different;

  if (check.missing.length || check.different.length) {
    const stagedDdocsCheck = ddocsService.compareDdocs(bundledDdocs, stagedDdocs);
    check.stagedUpgrade = !stagedDdocsCheck.missing.length && !stagedDdocsCheck.different.length;
    const allMissing = stagedDdocsCheck.missing.length === bundledDdocs.length;
    check.partialStagedUpgrade = !stagedDdocsCheck.different.length && !allMissing;
  } else {
    check.valid = true;
  }

  return check;
};

/**
 * Logs a human-readable summary of which docs are missing / different.
 * @param ddocValidation
 */
const logDdocCheck = (ddocValidation) => {
  const missing = [];
  const different = [];

  for (const database of DATABASES) {
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

const checkInstall = async () => {
  const ddocValidation = {};

  for (const database of DATABASES) {
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
    return upgradeSteps.complete();
  }

  const someDbsStaged = Object.values(ddocValidation).every(check => check.partialStagedUpgrade || check.valid);
  if (someDbsStaged) {
    // this can happen if new databases exist in the new version
    logger.info('Partially staged installation. Continuing staging.');
  } else {
    logger.info('Installation invalid. Staging install');
  }

  logDdocCheck(ddocValidation);

  await upgradeSteps.prep();
  await upgradeSteps.stage();
  await upgradeSteps.indexStagedViews();
  await upgradeSteps.complete();
};

module.exports = {
  run: checkInstall,
};
