const path = require('path');

const environment = require('../../environment');
const upgradeUtils = require('./utils');
const viewIndexerProgress = require('./indexer-progress');

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
      missing.push(ddocA._id);
    } else if (ddocA.secret !== ddocB.secret) {
      different.push(ddocA._id);
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
    // all good
    return;
  }

  const allDbsStaged = Object.values(ddocValidation).every(check => check.stagedUpgrade);
  if (allDbsStaged) {
    return completeInstall();
  }

  const indexViews = await upgradeUtils.stage();
  const stopQueryingIndexers = viewIndexerProgress.viewIndexerProgress();
  await indexViews();
  stopQueryingIndexers();

  return completeInstall();
};

module.exports = {
  checkInstall,
};
