const upgradeUtils = require('./utils');
const indexerProgress = require('./indexer-progress');

const upgrade = async (build, userCtx, stageOnly) => {
  // get version
  const indexViews = await upgradeUtils.stage(build.version);
  if (stageOnly) {
    indexViews();
    return;
  }

  await indexViews();
  await complete();
};

const complete = () => {
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
