const moment = require('moment');
const config = require('../config');
const transitionsLib = config.getTransitionsLib();
const date = transitionsLib.date;
const logger = require('../lib/logger');

const RUN_EVERY_MS = 5 * 60 * 1000; // 5 minutes

const ongoingTasks = new Set();


const getTime = (hour, minute) => moment(0).hours(hour).minutes(minute);
/*
 * Return true if within time window to set outgoing/pending tasks/messages.
 */
const sendable = () => {
  const afterHours = config.get('schedule_morning_hours') || 0;
  const afterMinutes = config.get('schedule_morning_minutes') || 0;
  const untilHours = config.get('schedule_evening_hours') || 23;
  const untilMinutes = config.get('schedule_evening_minutes') || 0;

  const today = moment(date.getDate());
  const now = getTime(today.hours(), today.minutes());
  const after = getTime(afterHours, afterMinutes);
  const until = getTime(untilHours, untilMinutes);

  return now >= after && now <= until;
};

const executeIfSendable = task => ({
  execute: () => {
    if (!sendable()) {
      return Promise.resolve();
    }
    return task.execute();
  },
});

const tasks = {
  dueTasks: executeIfSendable(transitionsLib.dueTasks),
  reminders: require('./reminders'),
  replications: require('./replications'),
  outbound: require('./outbound'),
  purging: require('./purging'),
  transitionsDisabledReminder: require('./transitions-disabled-reminder'),
  backgroundCleanup: require('./background-cleanup')
};

const runTasks = () => {
  logger.debug('Initiating all tasks');
  Object.keys(tasks).forEach(taskName => {
    if (ongoingTasks.has(taskName)) {
      logger.info(`Skipping Task ${taskName} as it's still running`);
      return;
    }

    ongoingTasks.add(taskName);
    logger.info(`Task ${taskName} started`);
    tasks[taskName]
      .execute()
      .then(() => logger.info(`Task ${taskName} completed`))
      .catch(err => logger.error(`Task ${taskName} completed with error: %o`, err))
      .finally(() => {
        ongoingTasks.delete(taskName);
      });
  });
};

// eslint-disable-next-line no-unused-vars
let interval; // used to clear the interval in unit tests
exports.init = () => {
  runTasks();
  interval = setInterval(runTasks, RUN_EVERY_MS);
};
