var CronJob = require('cron').CronJob;

var schedules = {
  // collect usage stats at 3am every day
  usageStats: {
    cron: '0 0 3 * * *',
    exec: require('./schedules/usage-stats').go
  },
  // submit usage stats at 30 minutes past the hour every hour
  statsSubmission: {
    cron: '0 30 * * * *',
    exec: require('./schedules/stats-submission').go
  }
};

var outputResult = function(name, err) {
  if (err) {
    return console.error('Schedule "' + name + '" failed:', err);
  }
  console.log('Schedule "' + name + '" completed successfully');
};

module.exports = {
  exec: function(name, callback) {
    var schedule = schedules[name];
    if (!schedule) {
      return callback(new Error('Unknown schedule: ' + name));
    }
    schedule.exec(callback);
  },
  init: function() {
    Object.keys(schedules).forEach(function(name) {
      new CronJob(schedules[name].cron, function() {
        module.exports.exec(name, function(err) {
          outputResult(name, err);
        });
      }).start();
    });
  }
};