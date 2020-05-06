const config = require('../config');
const later = require('later');
const db = require('../db');
const logger = require('../lib/logger');
const rpn = require('request-promise-native');

const PURGE_LOG_ID = '_local/purge_log';
// default CouchDB purge max_document_id_number
// https://docs.couchdb.org/en/master/cluster/purging.html#config-settings
const BATCH_SIZE = 100;

let timers = [];

// set later to use local time
later.date.localTime();

function isConfigValid(config) {
  // Failing parsing will throw an Error
  try {
    return Boolean(
      config.fromSuffix &&
      config.toSuffix &&
      getSchedule(config) !== null
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

const purgeDocs = (sourceDb, changes) => {
  if (!changes || !changes.length) {
    return Promise.resolve();
  }

  const docsToPurge = {};
  changes.forEach(change => docsToPurge[change.id] = [change.changes[0].rev]);

  return sourceDb
    .info()
    .then(info => {
      const opts = {
        uri: `${db.serverUrl}/${info.db_name}/_purge`,
        json: true,
        body: docsToPurge,
      };

      return rpn.post(opts);
    });
};

const purgeFeedback = (sourceDb, targetDb) => {
  return sourceDb.info().then(info => {
    return getPurgeLog(sourceDb).then(purgeLog => {
      return batchedPurge(sourceDb, targetDb, purgeLog.seq)
        .then(() => {
          purgeLog.seq = info.update_seq;
          return sourceDb.put(purgeLog);
        });
    });
  });
};

const getPurgeLog = (sourceDb) => {
  return sourceDb
    .get(PURGE_LOG_ID)
    .catch(err => {
      if (err.status === 404) {
        return {
          _id: PURGE_LOG_ID,
          seq: 0,
        };
      }
      throw err;
    });
};

const batchedPurge = (sourceDb, targetDb, lastSeq = 0) => {
  const opts = {
    since: lastSeq,
    limit: BATCH_SIZE,
    batch_size: BATCH_SIZE,
  };

  const getReplicatedIds = (targetDb, ids) => {
    if (!ids || !ids.length) {
      return Promise.resolve([]);
    }

    return targetDb.changes({ doc_ids: ids }).then(result => result.results.map(change => change.id));
  };

  return sourceDb
    .changes(opts)
    .then(result => {
      if (!result.results.length) {
        return;
      }

      const idsToPurge = result.results
        .filter(change => !change.deleted && isTelemetryOrFeedback(change.id))
        .map(change => change.id);

      if (!idsToPurge) {
        return result.last_seq;
      }

      return getReplicatedIds(targetDb, idsToPurge)
        .then(idsSafeToPurge => {
          const docsToPurge = result.results.filter(change => idsSafeToPurge.includes(change.id));
          return purgeDocs(sourceDb, docsToPurge);
        })
        .then(() => result.last_seq);
    })
    .then(nextSeq => nextSeq && batchedPurge(sourceDb, targetDb, nextSeq));
};

const isTelemetryOrFeedback = (docId) => docId.startsWith('telemetry-') || docId.startsWith('feedback-');

function replicateDb(sourceDb, targetDb) {
  // Replicate only telemetry and feedback docs
  return sourceDb.replicate
    .to(targetDb, {
      filter: doc => !doc._deleted && isTelemetryOrFeedback(doc._id),
    })
    .then(() => purgeFeedback(sourceDb, targetDb));
}

module.exports = {
  execute: callback => {
    const replications = config.get('replications') || [];

    // Clear existing timers
    timers.forEach(timer => timer.clear());
    timers = [];

    replications.reduce((p, replication) => {
      if (!isConfigValid(replication)) {
        throw new Error(
          `Invalid replication config with fromSuffix = '${replication.fromSuffix}', ` +
          `toSuffix = '${replication.toSuffix}', text expression = '${replication.text_expression}' and ` +
          `cron = '${replication.cron}'
        `);
      }

      const sched = getSchedule(replication);

      return p.then(() => {
        const timer = later.setInterval(() => module.exports.runReplication(replication), sched);
        timers.push(timer);
        return Promise.resolve();
      });
    }, Promise.resolve())
      .then(() => callback())
      .catch(callback);
  },
  runReplication: replication => {
    const srcRegex = new RegExp(`${db.medicDbName}-${replication.fromSuffix}`);

    const toDb = `${db.medicDbName}-${replication.toSuffix}`;
    return db.allDbs().then(dbs => {
      const srcDbs = dbs.filter(db => srcRegex.exec(db));
      return module.exports.replicateDbs(srcDbs, toDb);
    });
  },
  replicateDbs: (fromDbs, toDb) => {
    const targetDb = db.get(toDb);
    return fromDbs
      .reduce((p, fromDb) => {
        const sourceDb = db.get(fromDb);
        return p
          .then(() => logger.info(`Replicating docs from "${fromDb}" to "${toDb}"`))
          .then(() => replicateDb(sourceDb, targetDb))
          .then(() => db.close(sourceDb));
      }, Promise.resolve()
      )
      .then(() => db.close(targetDb));
  },
};
