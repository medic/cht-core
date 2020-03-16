const async = require('async');
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
  purging: require('./purging'),
  readdocs: require('./readdocs')
};

function getTime(_hour, _minute) {
  return moment(0)
    .hours(_hour)
    .minutes(_minute);
}

/*
 * Return true if within time window to set outgoing/pending tasks/messages.
 */
exports.sendable = function(config, now) {
  const afterHours = config.get('schedule_morning_hours') || 0;
  const afterMinutes = config.get('schedule_morning_minutes') || 0;
  const untilHours = config.get('schedule_evening_hours') || 23;
  const untilMinutes = config.get('schedule_evening_minutes') || 0;

  now = getTime(now.hours(), now.minutes());
  const after = getTime(afterHours, afterMinutes);
  const until = getTime(untilHours, untilMinutes);

  return now >= after && now <= until;
};


exports.checkSchedule = function() {
  const now = moment(date.getDate());

  // TODO: why are these series? Wouldn't it be better to basically fire them all off once every 5
  // minutes, and then 5 minutes later if they *need* to be fired off fire them off again? That way
  // none of them block each other
  async.series(
    [
      cb => {
        tasks.reminders.execute(cb);
      },
      cb => {
        if (exports.sendable(config, now)) {
          tasks.dueTasks.execute(cb);
        } else {
          cb();
        }
      },
      cb => {
        tasks.replications.execute(cb);
      },
      tasks.outbound.execute,
      tasks.purging.execute,
      tasks.readdocs.execute
    ],
    err => {
      if (err) {
        logger.error('Error running tasks: %o', err);
      }
      _reschedule();
    }
  );
};

function _reschedule() {
  const now = moment();
  const heartbeat = now
    .clone()
    .startOf('minute')
    .add(5, 'minutes');
  const duration = moment.duration(heartbeat.valueOf() - now.valueOf());

  logger.info(`checking schedule again in ${moment.duration(duration).humanize()}`);
  setTimeout(exports.checkSchedule, duration.asMilliseconds());
}
