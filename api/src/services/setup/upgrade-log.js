const db = require('../../db');
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
  FINALIZING: 'finalizing',
  FINALIZED: 'finalized',
  COMPLETE: 'complete',
  ABORTED: 'aborted',
  ERRORED: 'errored',
};

const isFinalState = (state) => {
  return state === UPGRADE_LOG_STATES.FINALIZED ||
         state === UPGRADE_LOG_STATES.COMPLETE ||
         state === UPGRADE_LOG_STATES.ABORTED ||
         state === UPGRADE_LOG_STATES.ERRORED;
};

const UPGRADE_LOG_NAME = 'upgrade_log';

const getUpgradeLogId = (version, startDate) => `${UPGRADE_LOG_NAME}:${startDate}:${version}`;

/**
 * Gets last chronological upgrade log
 * @returns UpgradeLog | undefined
 */
const getUpgradeLog = async () => {
  const now = new Date().getTime();
  const results = await db.medicLogs.allDocs({
    startkey: `${UPGRADE_LOG_NAME}:${now}`,
    descending: true,
    limit: 1,
    include_docs: true
  });

  if (!results.rows.length) {
    return;
  }

  const upgradeLog = results.rows[0].doc;
  if (isFinalState(upgradeLog.state)) {
    logger.info('Last upgrade log is already final');
    return;
  }
  return upgradeLog;
};

const getDeployInfo = async () => {
  const log = await getUpgradeLog() || {};
  return {
    user: log.user,
    upgrade_log_id: log._id,
  };
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
const createUpgradeLog = async (action, toVersion = '', fromVersion = '', username = '') => {
  logger.info(`Staging ${toVersion}`);
  const startDate = new Date().getTime();

  /**
   * @type UpgradeLog
   */
  const upgradeLog = {
    _id: getUpgradeLogId(toVersion, startDate),
    user: username,
    action,
    from_version: fromVersion,
    to_version: toVersion,
    start_date: startDate,
  };
  pushState(upgradeLog, UPGRADE_LOG_STATES.INITIATED, startDate);

  await db.medicLogs.put(upgradeLog);
};

/**
 * @param {string} state
 */
const update = async (state) => {
  const upgradeLog = await getUpgradeLog();
  if (!upgradeLog) {
    logger.info('Upgrade log tracking file was not found.');
    return;
  }
  pushState(upgradeLog, state);
  return upgradeLog;
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

const setAborted = async () => {
  const upgradeLog = await getUpgradeLog();
  if (upgradeLog.state === UPGRADE_LOG_STATES.FINALIZED) { // todo
    return;
  }

  await update(UPGRADE_LOG_STATES.ABORTED);
};

const setErrored = () => update(UPGRADE_LOG_STATES.ERRORED);

module.exports = {
  create: createUpgradeLog,
  get: getUpgradeLog(),
  getDeployInfo,
  setStaged,
  setIndexing,
  setIndexed,
  setCompleting,
  setComplete,
  setAborted,
  setErrored,
};
