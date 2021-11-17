const upgradeUtils = require('./utils');

const upgrade = async (build, userCtx, stageOnly) => {
  // get version
  const indexViewPromises = await upgradeUtils.stage(build.version);
  if (stageOnly) {
    return;
  }

  await Promise.all(indexViewPromises());
  await complete();
};

const complete = () => {
  // todo
  // this is going to send a request to the upgrade container to update the containers
  // the actual upgrading will be performed on first startup of new API
};

module.exports = {
  upgrade,
  complete,
};
