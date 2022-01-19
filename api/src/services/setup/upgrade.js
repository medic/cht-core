const indexerProgress = require('./indexer-progress');
const upgradeLogService = require('./upgrade-log');
const installer = require('./install');
const logger = require('../../logger');

const upgrade = async (build, username, stageOnly) => {
  if (!build) {
    throw new Error('Build is invalid');
  }

  try {
    await installer.stage(build.version, username);
    if (stageOnly) {
      indexViews();
      return;
    }

    await installer.indexStagedViews();
    await complete();
  } catch (err) {
    await upgradeLogService.setErrored();
    throw err;
  }

};

const indexViews = async () => {
  try {
    await installer.indexStagedViews();
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

const progress = () => indexerProgress.query();

module.exports = {
  upgrade,
  complete,
  progress,
};
