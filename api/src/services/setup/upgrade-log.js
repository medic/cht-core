const fs = require('fs');
const path = require('path');

const db = require('../../db');
const environment = require('../../environment');
const logger = require('../../logger');

/**
 * @typedef {Object} UpgradeLog
 * @property {string} _id
 * @property {string} user - username of user initiating the upgrade (eg. "mary")
 * @property {string} from_version - eg "4.0.3"
 * @property {string} to_version - eg "4.1.2"
 * @property {number} start_date - timestamp when upgrade was initiated
 * @property {number} updated_date - timestamp when the log was last updated
 * @property {string} state - latest upgrade state
 * @property {Array<Object>} state_history
 * @property {number} state_history[].date
 * @property {string} state_history[].state
 * @property {any} state_history[].details
 */

const UPGRADE_LOG_STATES = {
  INITIATED: 'initiated',
  STAGED: 'staged',
  INDEXING: 'indexing',
  INDEXED: 'indexed',
  COMPLETING: 'completing',
  COMPLETE: 'complete',
  ABORTED: 'aborted',
  ERRORED: 'errored',
};

const UPGRADE_LOG_NAME = 'upgrade_log';
const UPGRADE_LOG_PATH = path.join(environment.upgradePath, 'upgrade_log.json');

const getLocalVersion = () => {};

const getUpgradeLogId = (version, startDate) => `${UPGRADE_LOG_NAME}:${version}:${startDate}`;

const getCurrentUpgradeLogContents = async () => {
  try {
    const content = await fs.promises.readFile(UPGRADE_LOG_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // file missing

    }

    logger.error('Error when getting current upgrade log contents: %o', err);
  }
};

/**
 * Updates the upgrade log with a new state
 * @param {UpgradeLog} upgradeLog
 * @param {string} state
 * @param {number} date
 */
const pushState = (upgradeLog, state, date = new Date().getTime()) => {
  upgradeLog.state_history = upgradeLog.state_history || [];
  upgradeLog.state = state;
  upgradeLog.updated_date = date;
  upgradeLog.state_history.push({ state, date });
};

/**
 * Creates, saves and returns contents of a new upgrade log file
 * @param {string} toVersion
 * @param {string} fromVersion
 * @param {string} username
 * @return {Promise<UpgradeLog>}
 */
const create = async (toVersion, fromVersion = '', username = '') => {
  logger.info(`Staging ${toVersion}`);
  const startDate = new Date().getTime();

  /**
   * @type UpgradeLog
   */
  const upgradeLog = {
    _id: getUpgradeLogId(toVersion, startDate),
    user: username,
    from_version: fromVersion,
    to_version: toVersion,
    start_date: startDate,
  };
  pushState(upgradeLog, UPGRADE_LOG_STATES.INITIATED, startDate);

  await db.medicLogs.put(upgradeLog);
  await fs.promises.writeFile(UPGRADE_LOG_PATH, JSON.stringify(upgradeLog));
  return upgradeLog;
};

/**
 * @param {string} state
 */
const update = async (state) => {
  const upgradeLogFile = await getCurrentUpgradeLogContents();
  if (!upgradeLogFile) {
    logger.info('Upgrade log tracking file was not found.');
    return;
  }
  /**
   * @type UpgradeLog
   */
  const upgradeLog = await db.medicLogs.get(upgradeLogFile._id);
  pushState(upgradeLog, state);
  await db.medicLogs.put(upgradeLog);
  await fs.promises.writeFile(UPGRADE_LOG_PATH, JSON.stringify(upgradeLog));
};

const setStaged = async () => {
  await update(UPGRADE_LOG_STATES.STAGED);
  logger.info('Staging complete');
};

const setIndexing = async () => {
  logger.info('Indexing staged views');
  await update(UPGRADE_LOG_STATES.INDEXING);
};

const setIndexed = async () => {
  logger.info('Indexing views complete');
  await update(UPGRADE_LOG_STATES.INDEXED);
};

const setCompleting = async () => {
  logger.info('Completing install');
  await update(UPGRADE_LOG_STATES.COMPLETING);
};

const setComplete = async () => {
  await update(UPGRADE_LOG_STATES.COMPLETE);
  logger.info('Install complete');
};

const setAborted = () => update(UPGRADE_LOG_STATES.ABORTED);
const setErrored = () => update(UPGRADE_LOG_STATES.ERRORED);

module.exports = {
  create,
  setStaged,
  setIndexing,
  setIndexed,
  setCompleting,
  setComplete,
  setAborted,
  setErrored,
};
