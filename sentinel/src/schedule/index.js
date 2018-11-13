const async = require('async'),
  moment = require('moment'),
  date = require('../date'),
  config = require('../config'),
  logger = require('../lib/logger'),
  db = require('../db-nano');

const tasks = {
  dueTasks: require('./due_tasks'),
  reminders: require('./reminders'),
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
  const afterHours = config.get('schedule_morning_hours') || 0,
    afterMinutes = config.get('schedule_morning_minutes') || 0,
    untilHours = config.get('schedule_evening_hours') || 23,
    untilMinutes = config.get('schedule_evening_minutes') || 0;

  now = getTime(now.hours(), now.minutes());
  const after = getTime(afterHours, afterMinutes);
  const until = getTime(untilHours, untilMinutes);

  return now >= after && now <= until;
};

exports.checkSchedule = function() {
  const now = moment(date.getDate());

  async.series(
    [
      cb => {
        tasks.reminders.execute(
          {
            db: db,
          },
          cb
        );
      },
      cb => {
        if (exports.sendable(config, now)) {
          tasks.dueTasks.execute(db, cb);
        } else {
          cb();
        }
      },
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
  const now = moment(),
    heartbeat = now
      .clone()
      .startOf('minute')
      .add(5, 'minutes'),
    duration = moment.duration(heartbeat.valueOf() - now.valueOf());

  logger.info(`checking schedule again in ${moment.duration(duration).humanize()}`);
  setTimeout(exports.checkSchedule, duration.asMilliseconds());
}
