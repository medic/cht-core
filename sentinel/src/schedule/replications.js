var async = require('async'),
    config = require('../config'),
    later = require('later'),
    db = require('../db');

// set later to use local time
later.date.localTime();

function isConfigValid(config) {
    return Boolean(
        config.from &&
        config.to &&
        (config.text_expression || config.cron)
    );
}

function getSchedule(config) {
    // fetch a schedule based on the configuration, parsing it as a "cron"
    // or "text" statement see:
    // http://bunkat.github.io/later/parsers.html
    if (!config) {
        return;
    }
    if (config.text_expression) {
        // text expression takes precedence over cron
        return later.parse.text(config.text_expression);
    }
    if (config.cron) {
        return later.parse.cron(config.cron);
    }
}

function replicate(fromDbs, toDb, callback) {
	const targetDb = db.get(toDb);
  async.forEach(
    fromDbs,
    function(fromDb, callback) {
      const sourceDb = db.get(fromDb);
      return targetDb.info()
                     .then(() => sourceDb.replicate.to(targetDb))
                     .catch(callback);
    },
    function(err) {
      callback(err);
    }
  );	
}

module.exports = {
    execute: callback => {
        var replications = config.get('replications') || [];

        async.eachSeries(replications, function(replication, callback) {
            if (!isConfigValid(replication)) {
                return callback();
            }

            const sched = getSchedule(replication);
            later.setInterval(() => module.exports.runReplication(replication, callback), sched);

        }, callback);
    },
    runReplication: function(replication, callback) {
      const srcRegex = new RegExp(replication.from);

      const toDb = replication.to;
      return db.allDbs().then(dbs => {
        const srcDbs = dbs.filter(db => srcRegex.exec(db));
        replicate(srcDbs, toDb, callback);
      })
      .catch(callback);
    },
};