const viewIndexerProgress = require('./view-indexer-progress');
const upgradeLog = require('./upgrade-log');
const upgradeSteps = require('./upgrade-steps');
const logger = require('../../logger');

const upgrade = async (version, username, stageOnly) => {
  if (!version) {
    throw new Error('Version is invalid');
  }

  try {
    await upgradeSteps.prep(version, username, stageOnly);
    safeInstall(version, stageOnly);
  } catch (err) {
    await upgradeLog.setErrored();
    throw err;
  }
};

const safeInstall = async (version, stageOnly) => {
  try {
    await upgradeSteps.stage(version);
    await upgradeSteps.indexStagedViews();
    if (stageOnly) {
      return;
    }
    await complete();
  } catch (err) {
    await upgradeLog.setErrored();
    logger.error('Error thrown when indexing views %o', err);
  }
};

const complete = async () => {
  // todo
  // this is going to send a request to the bridge container to pull new source code
  // completing the install (overwriting the staged ddocs) is done when API starts up.
};

const abort = () => upgradeSteps.abort();

const indexerProgress = () => viewIndexerProgress.query();
const upgradeInProgress = () => upgradeLog.get();

module.exports = {
  upgrade,
  complete,
  abort,
  upgradeInProgress,
  indexerProgress,
};
