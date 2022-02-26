const viewIndexerProgress = require('./view-indexer-progress');
const upgradeLog = require('./upgrade-log');
const upgradeSteps = require('./upgrade-steps');
const logger = require('../../logger');

/**
 * @typedef {Object} BuildInfo
 * @property {string} namespace - default "medic"
 * @property {string} application - default "medic"
 * @property {string} version - tag, branch or local
 * @property {string} build - unique tag for a build. Semver valid.
 */

/**
 * Initiates an upgrade.
 * Returns immediately after prep, because this is called by a user-initiated action that should get a quick response,
 * and starts the upgrade process outside the promise chain.
 * @param {BuildInfo} buildInfo
 * @param {string} username
 * @param {boolean} stageOnly
 * @return {Promise<void>}
 */
const upgrade = async (buildInfo, username, stageOnly) => {
  try {
    await upgradeSteps.prep(buildInfo, username, stageOnly);
    safeInstall(buildInfo, stageOnly);
  } catch (err) {
    await upgradeLog.setErrored();
    throw err;
  }
};

/**
 * @param {BuildInfo} buildInfo
 * @param {boolean} stageOnly
 * @return {Promise<void>}
 */
const safeInstall = async (buildInfo, stageOnly) => {
  try {
    await upgradeSteps.stage(buildInfo);
    await upgradeSteps.indexStagedViews();
    if (stageOnly) {
      return;
    }
    await complete(buildInfo);
  } catch (err) {
    await upgradeLog.setErrored();
    logger.error('Error thrown while installing: %o', err);
  }
};

/**
 * @param {BuildInfo} buildInfo
 * @return {Promise<void>}
 */
const complete = async (buildInfo) => {
  // todo
  logger.debug('%o', buildInfo); // don't complain about unused variables
  // test if build info matches
  // this is going to send a request to the bridge container to pull new source code
  // completing the install (overwriting the staged ddocs) is done when API starts up.
};

const abort = () => {
  return upgradeSteps.abort();
};

const indexerProgress = () => viewIndexerProgress.query();
// todo: how to "resume" an upgrade
const upgradeInProgress = () => {
  return upgradeLog.get();
};

module.exports = {
  upgrade,
  complete,
  abort,
  upgradeInProgress,
  indexerProgress,
};
