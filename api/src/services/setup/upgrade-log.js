const db = require('../../db');
const logger = require('../../logger');

/**
 * @typedef {Object} UpgradeLog
 * @property {string} _id
 * @property {string} user - username of user initiating the upgrade (eg. "mary")
 * @property {string} action - install, stage or upgrade
 * @property {BuildInfo} from
 * @property {BuildInfo} to
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
  ABORTING: 'aborting',
  ABORTED: 'aborted',
  ERRORED: 'errored',
  INTERRUPTED: 'interrupted',
};

const UPGRADE_ACTIONS = {
  INSTALL: 'install',
  STAGE: 'stage',
  UPGRADE: 'upgrade',
};

const isFinalState = (state) => {
  return state === UPGRADE_LOG_STATES.FINALIZED ||
         state === UPGRADE_LOG_STATES.ABORTED ||
         state === UPGRADE_LOG_STATES.ERRORED;
};

const UPGRADE_LOG_NAME = 'upgrade_log';

const getUpgradeLogId = (version, startDate) => `${UPGRADE_LOG_NAME}:${startDate}:${version}`;

/**
 * Returns that most recently dated upgrade log.
 * @return {Promise<UpgradeLog | undefined>}
 */
const getLatestUpgradeLog = async () => {
  const now = new Date().getTime();
  const results = await db.medicLogs.allDocs({
    startkey: `${UPGRADE_LOG_NAME}:${now}:`,
    endkey: `${UPGRADE_LOG_NAME}:0:`,
    descending: true,
    limit: 1,
    include_docs: true
  });

  if (!results.rows.length) {
    return;
  }

  return results.rows[0].doc;
};

/**
 * Gets the current upgrade log. If not available in memory, gets last chronological upgrade log, if it is not in a
 * final state.
 * Returns undefined if neither are found.
 * @return {Promise<UpgradeLog | undefined>}
 */
const getUpgradeLog = async () => {
  const upgradeLog = await getLatestUpgradeLog();

  if (upgradeLog && isFinalState(upgradeLog.state)) {
    logger.info('Last upgrade log is already final.');
    return;
  }

  return upgradeLog;
};

/**
 * Returns the user and the _id of the current upgrqde log
 * @return {Promise<{upgrade_log_id: string, user: string}>}
 */
const getDeployInfo = async () => {
  const log = await module.exports.get() || {};
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
 * @param {string} action - install, stage or upgrade
 * @param {BuildInfo} toBuild
 * @param {BuildInfo|undefined} fromBuild
 * @param {string} username
 * @return {Promise<UpgradeLog>}
 */
const createUpgradeLog = async (action, toBuild, fromBuild, username = '') => {
  logger.info(`Staging ${toBuild.build}`);
  const startDate = new Date().getTime();

  /**
   * @type UpgradeLog
   */
  const upgradeLog = {
    _id: getUpgradeLogId(toBuild.version, startDate),
    user: username,
    action,
    from: fromBuild,
    to: toBuild,
    start_date: startDate,
  };
  pushState(upgradeLog, UPGRADE_LOG_STATES.INITIATED, startDate);

  await db.medicLogs.put(upgradeLog);
  return upgradeLog;
};

/**
 * Updates the current upgrade log to set the new state
 * Updates are skipped if the current log is already in a final state.
 * If the new state is final, the log is no longer stored as "current"
 * @param {string} state
 * @returns {Promise}
 */
const update = async (state) => {
  const upgradeLog = await module.exports.get();
  if (!upgradeLog) {
    logger.info('Valid Upgrade log tracking file was not found. Not updating.');
    return;
  }

  if (isFinalState(upgradeLog.state)) {
    return;
  }

  if (upgradeLog.state === state) {
    return;
  }

  pushState(upgradeLog, state);
  await db.medicLogs.put(upgradeLog);

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

const setFinalizing = async () => {
  logger.info('Finalizing install');
  await update(UPGRADE_LOG_STATES.FINALIZING);
};

const setFinalized = async () => {
  await update(UPGRADE_LOG_STATES.FINALIZED);
  logger.info('Install finalized');
};

const setAborting = async () => {
  logger.info('Aborting upgrade');
  await update(UPGRADE_LOG_STATES.ABORTING);
};

const setAborted = async () => {
  logger.info('Upgrade aborted');
  await update(UPGRADE_LOG_STATES.ABORTED);
};

const setInterrupted = async () => {
  logger.info('Upgrade interrupted');
  await update(UPGRADE_LOG_STATES.INTERRUPTED);
};

const setErrored = () => update(UPGRADE_LOG_STATES.ERRORED);

module.exports = {
  create: createUpgradeLog,
  get: getUpgradeLog,
  getDeployInfo,
  setStaged,
  setIndexing,
  setIndexed,
  setCompleting,
  setComplete,
  setFinalizing,
  setFinalized,
  setAborting,
  setAborted,
  setErrored,
  setInterrupted,

  actions: UPGRADE_ACTIONS,
  states: UPGRADE_LOG_STATES,
};
