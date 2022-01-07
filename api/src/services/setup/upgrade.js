const upgradeUtils = require('./utils');
const indexerProgress = require('./indexer-progress');
const upgradeLogService = require('./upgrade-log');

const upgrade = async (build, username, stageOnly) => {
  try {
    const indexViews = await upgradeUtils.stage(build.version, username);
    if (stageOnly) {
      indexViews();
      return;
    }

    await indexViews();
    await complete();
  } catch (err) {
    await upgradeLogService.setErrored();
    throw err;
  }

};

const complete = async () => {
  await upgradeLogService.setComplete();
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
