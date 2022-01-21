const indexerProgressService = require('./indexer-progress');
const upgradeLogService = require('./upgrade-log');
const installer = require('./install');
const logger = require('../../logger');

const upgrade = async (version, username, stageOnly) => {
  if (!version) {
    throw new Error('Version is invalid');
  }

  try {
    await installer.prep(version, username, stageOnly);
    safeInstall(version, stageOnly);
  } catch (err) {
    await upgradeLogService.setErrored();
    throw err;
  }
};

const safeInstall = async (version, stageOnly) => {
  try {
    await installer.stage(version);
    await installer.indexStagedViews();
    if (stageOnly) {
      return;
    }
    await complete();
  } catch (err) {
    await upgradeLogService.setErrored();
    logger.error('Error thrown when indexing views %o', err);
  }
};

const complete = async () => {
  // todo
  // this is going to send a request to the bridge container to pull new source code
  // completing the install (overwriting the staged ddocs) is done when API starts up.
};

const abort = () => installer.abort();

const indexerProgress = () => indexerProgressService.query();
const upgradeInProgress = () => upgradeLogService.getUpgradeLog();

module.exports = {
  upgrade,
  complete,
  abort,
  upgradeInProgress,
  indexerProgress,
};
