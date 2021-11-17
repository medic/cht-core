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
    const bundledDdoc = bundledDdocs.find(bundledDdoc => bundledDdoc._id === uploadedDdoc.id);
    if (!bundledDdoc) {
      missing.push(uploadedDdoc.id);
    } else if (bundledDdoc.secret !== uploadedDdoc.doc.secret) {
      different.push(uploadedDdoc.id);
    }
  }

  for (const bundledDdoc of bundledDdocs) {
    const uploadedDdoc = uploadedDdocs.find(uploadedDdoc => {
      return uploadedDdoc.id === bundledDdoc._id || upgradeUtils.getDdocId(uploadedDdoc.id) === bundledDdoc._id;
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
    check[database.name] = {};

    const allDdocs = await upgradeUtils.getDdocs(database, true);
    const uploadedDdocs = allDdocs.filter(ddoc => !upgradeUtils.isStagedDdoc(ddoc.id));
    const stagedDdocs = allDdocs.filter(ddoc => upgradeUtils.isStagedDdoc(ddoc.id));

    const bundledDdocs = getBundledDdocs(database.jsonFileName);
    // todo improve this
    const { missing , different } = compareUploadedToBundledDdocs(uploadedDdocs, bundledDdocs);
    check[database.name].missing = missing;
    check[database.name].different = different;

    if (missing.length || different.length) {
      const { missing, different } = compareUploadedToBundledDdocs(stagedDdocs, bundledDdocs);
      check.stagedUpgrade = !missing.length && !different.length;
    } else {
      check.valid = true;
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
