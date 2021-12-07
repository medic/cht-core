const path = require('path');

const environment = require('../../environment');
const upgradeUtils = require('./utils');
const viewIndexerProgress = require('./indexer-progress');
const logger = require('../../logger');

const getBundledDdocs = (jsonFileName) => {
  return require(path.join(environment.ddocsPath, jsonFileName)).docs;
};

const compareDdocs = (ddocsA, ddocsB) => {
  const missing = [];
  const different = [];

  const findCorrespondingDdoc = (ddocA, ddocsB) => {
    const ddocAName = upgradeUtils.getDdocName(ddocA._id);
    return ddocsB.find(ddocB => upgradeUtils.getDdocName(ddocB._id) === ddocAName);
  };

  for (const ddocA of ddocsA) {
    const ddocB = findCorrespondingDdoc(ddocA, ddocsB);
    if (!ddocB) {
      missing.push(ddocB._id);
    } else if (ddocA.secret !== ddocB.secret) {
      different.push(ddocB._id);
    }
  }

  for (const ddocB of ddocsB) {
    const ddocA = findCorrespondingDdoc(ddocB, ddocsA);
    if (!ddocA) {
      missing.push(ddocB._id);
    } else if (ddocA.secret !== ddocB.secret) {
      different.push(ddocB._id);
    }
  }

  return { missing, different };
};

const completeInstall = async () => {
  await upgradeUtils.complete();
  await upgradeUtils.cleanup();
};

const checkInstall = async () => {
  const ddocValidation = {};

  for (const database of upgradeUtils.DATABASES) {
    ddocValidation[database.name] = {};

    const allDdocs = await upgradeUtils.getDdocs(database, true);

    const liveDdocs = allDdocs.filter(ddoc => !upgradeUtils.isStagedDdoc(ddoc._id));
    const stagedDdocs = allDdocs.filter(ddoc => upgradeUtils.isStagedDdoc(ddoc._id));
    const bundledDdocs = getBundledDdocs(database.jsonFileName);

    const { missing , different } = compareDdocs(liveDdocs, bundledDdocs);
    ddocValidation[database.name].missing = missing;
    ddocValidation[database.name].different = different;

    if (missing.length || different.length) {
      const { missing: missingStaged, different: differentStaged } = compareDdocs(stagedDdocs, bundledDdocs);
      ddocValidation[database.name].stagedUpgrade = !missingStaged.length && !differentStaged.length;
    } else {
      ddocValidation[database.name].valid = true;
    }
  }

  const allDbsValid = Object.values(ddocValidation).every(check => check.valid);
  if (allDbsValid) {
    logger.info('Installation valid');
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
  logger.debug(`Found different ddocs: ${different}`);
};

module.exports = {
  checkInstall,
};
