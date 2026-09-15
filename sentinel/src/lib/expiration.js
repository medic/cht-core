const moment = require('moment');

// How long terminal tasks and old targets are kept. Purging hides them from offline users and
// archiving removes them from medic, so both features read the same boundary from here: a
// change to one that silently left the other behind would archive docs clients still hold.
const TASK_EXPIRATION_PERIOD = 60; // days
const TARGET_EXPIRATION_PERIOD = 6; // months

/**
 * The newest `emission.endDate` an expired task can carry, keyed as `medic/tasks_in_terminal_state`
 * emits it.
 * @returns {string} YYYY-MM-DD
 */
const getMaximumEmissionEndDate = () => moment()
  .subtract(TASK_EXPIRATION_PERIOD, 'days')
  .format('YYYY-MM-DD');

/**
 * The newest reporting interval tag an expired target can carry, as target doc ids embed it.
 * @returns {string} YYYY-MM
 */
const getLastAllowedReportingIntervalTag = () => moment()
  .subtract(TARGET_EXPIRATION_PERIOD, 'months')
  .format('YYYY-MM');

module.exports = {
  getMaximumEmissionEndDate,
  getLastAllowedReportingIntervalTag,
};
