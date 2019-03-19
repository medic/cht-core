const config = require('../config'),
      later = require('later'),
      db = require('../db');

// set later to use local time
later.date.localTime();

function isConfigValid(config) {
  // Failing parsing will throw an Error
  try {
    return Boolean(
      config.from &&
      config.to &&
      (config.text_expression  && later.parse.text(config.text_expression) || 
       config.cron && later.parse.cron(config.cron))
    );
  } catch(e) {
    return false;
  }
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

function replicate(fromDbs, toDb) {
	const targetDb = db.get(toDb);
  return fromDbs.reduce((p, fromDb) => {
    return p.then(() => db.get(fromDb).replicate.to(targetDb));
  }, Promise.resolve());
}

module.exports = {
  execute: callback => {
    const replications = config.get('replications') || [];

    replications.reduce((p, replication) => {
      if (!isConfigValid(replication)) {
        return Promise.reject(`Invalid replication config with text expression = '${replication.text_expression}' and cron = '${replication.cron}'`);
      }

      const sched = getSchedule(replication);

      return p.then(() => later.setInterval(() => module.exports.runReplication(replication), sched));
    }, Promise.resolve())
    .then(callback)
    .catch(callback);
  },
  runReplication: function(replication) {
    const srcRegex = new RegExp(replication.from);

    const toDb = replication.to;
    return db.allDbs().then(dbs => {
      const srcDbs = dbs.filter(db => srcRegex.exec(db));
      return replicate(srcDbs, toDb);
    });
  },
};