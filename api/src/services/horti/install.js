const path = require('path');

const environment = require('../../environment');
const upgradeUtils = require('./utils');

const getBundledDdocs = (jsonFileName) => {
  return require(path.join(environment.getDdocsPath(), jsonFileName)).docs;
};

const compareUploadedToBundledDdocs = (uploadedDdocs, bundledDdocs) => {
  const missing = [];
  const different = [];

  for (const uploadedDdoc of uploadedDdocs) {
    const bundledDdoc = bundledDdocs.find(bundledDdoc => bundledDdoc._id === uploadedDdoc._id);

    if (!bundledDdoc) {
      missing.push(uploadedDdoc._id);
      continue;
    }

    if (bundledDdoc.secret !== uploadedDdoc.secret) {
      different.push(uploadedDdoc._id);
      different.push(uploadedDdoc._id);
    }
  }

  for (const bundledDdoc of bundledDdocs) {
    const uploadedDdoc = uploadedDdocs.find(uploadedDdoc => {
      return uploadedDdoc._id === bundledDdoc._id || upgradeUtils.getDdocId(uploadedDdoc._id) === bundledDdoc._id;
    });

    if (!uploadedDdoc) {
      missing.push(bundledDdoc._id);
    }
  }

  return { missing, different };
};

const checkInstall = async () => {
  const check = {};

  for (const database of upgradeUtils.DATABASES) {
    const dbCheck = {};
    check[database.name] = dbCheck;

    const allDdocs = await upgradeUtils.getDdocs(database, true);
    const uploadedDdocs = allDdocs.filter(ddoc => !upgradeUtils.isStagedDdoc(ddoc._id));
    const stagedDdocs = allDdocs.filter(ddoc => upgradeUtils.isStagedDdoc(ddoc._id));

    const bundledDdocs = getBundledDdocs(database.jsonFileName);
    // todo improve this
    const { missing , different } = compareUploadedToBundledDdocs(uploadedDdocs, bundledDdocs);
    dbCheck.missing = missing;
    dbCheck.different = different;

    if (missing.length || different.length) {
      const { missing, different } = compareUploadedToBundledDdocs(stagedDdocs, bundledDdocs);
      dbCheck.stagedUpgrade = !missing.length && !different.length;
    } else {
      dbCheck.valid = true;
    }
  }

  const allDbsValid = Object.values(check).every(check => check.valid);
  if (allDbsValid) {
    // all good
    return;
  }

  const allDbsStaged = Object.values(check).every(check => check.stagedUpgrade);
  if (allDbsStaged) {
    await upgradeUtils.complete();
    await upgradeUtils.cleanup();
    return;
  }

  const indexViewPromises = await upgradeUtils.stage();
  await Promise.all(indexViewPromises());
  await upgradeUtils.complete();
  await upgradeUtils.cleanup();
};

module.exports = {
  checkInstall,
};
