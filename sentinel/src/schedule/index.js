const moment = require('moment');
const config = require('../config');
const transitionsLib = config.getTransitionsLib();
const date = transitionsLib.date;
const logger = require('../lib/logger');

const tasks = {
  dueTasks: transitionsLib.dueTasks,
  reminders: require('./reminders'),
  replications: require('./replications'),
  outbound: require('./outbound'),
  purging: require('./purging')
};

function getTime(hour, minute) {
  return moment(0)
    .hours(hour)
    .minutes(minute);
}

function reschedule() {
  const now = moment();
  const heartbeat = now
    .clone()
    .startOf('minute')
    .add(5, 'minutes');
  const duration = moment.duration(heartbeat.valueOf() - now.valueOf());

  logger.info(`checking schedule again in ${moment.duration(duration).humanize()}`);
  setTimeout(exports.checkSchedule, duration.asMilliseconds());
}

const executeIfSendable = task => {
  if (!exports.sendable()) {
    return Promise.resolve();
  }
  return task.execute();
};

/*
 * Return true if within time window to set outgoing/pending tasks/messages.
 */
exports.sendable = function() {
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

exports.checkSchedule = function() {
  tasks.reminders.execute()
    .then(() => executeIfSendable(tasks.dueTasks))
    .then(() => tasks.replications.execute())
    .then(() => tasks.outbound.execute())
    .then(() => tasks.purging.execute())
    .catch(err => logger.error('Error running tasks: %o', err))
    .then(() => reschedule());
};
