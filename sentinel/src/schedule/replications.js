const later = require('later');
const db = require('../db');
const logger = require('../lib/logger');
const rpn = require('request-promise-native');

const PURGE_LOG_ID = '_local/purge_log';
// default CouchDB purge max_document_id_number
// https://docs.couchdb.org/en/master/cluster/purging.html#config-settings
const BATCH_SIZE = 100;

const CRON_EXPRESSION = '0 2 * * *'; // run at 2am every day

let timer;

// set later to use local time
later.date.localTime();

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

const purgeFeedback = (sourceDb, info, targetDb) => {
  return getPurgeLog(sourceDb).then(purgeLog => {
    return batchedPurge(sourceDb, targetDb, purgeLog.seq).then(() => {
      purgeLog.seq = info.update_seq;
      return sourceDb.put(purgeLog);
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

const replicateDb = (sourceDb, targetDb) => {
  // Replicate only telemetry and feedback docs
  return sourceDb.info().then(info => {
    return sourceDb.replicate
      .to(targetDb, {
        filter: doc => !doc._deleted && isTelemetryOrFeedback(doc._id),
      })
      .then(() => purgeFeedback(sourceDb, info, targetDb));
  });
};

module.exports = {
  execute: () => {
    if (!timer) {
      const schedule = later.parse.cron(CRON_EXPRESSION);
      timer = later.setInterval(() => module.exports.runReplication(), schedule);
    }
    return Promise.resolve();
  },
  runReplication: () => {
    const SRC_DB_REGEX = new RegExp(`${db.medicDbName}-user-.+-meta`);
    const TO_DB_NAME = `${db.medicDbName}-users-meta`;
    return db.allDbs().then(dbs => {
      const srcDbs = dbs.filter(db => SRC_DB_REGEX.exec(db));
      return module.exports.replicateDbs(srcDbs, TO_DB_NAME);
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
      }, Promise.resolve())
      .then(() => db.close(targetDb));
  },
};
