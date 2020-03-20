const async = require('async');
const logger = require('./logger');
const db = require('../db');
const metadata = require('./metadata');
const tombstoneUtils = require('@medic/tombstone-utils');
const transitionsLib = require('../config').getTransitionsLib();

// we don't run transitions on ddocs or info docs
const IDS_TO_IGNORE = /^_design\/|-info$/;

const RETRY_TIMEOUT = 60000; // 1 minute
const PROGRESS_REPORT_INTERVAL = 500; // items
const MAX_QUEUE_SIZE = 100;

let request;
let processed = 0;

const enqueue = change => changeQueue.push(change);

const updateMetadata = (change, callback) => {
  processed++;
  metadata
    .setTransitionSeq(change.seq)
    .then(() => callback())
    .catch(callback);
};

const getTransitionSeq = () => {
  return metadata
    .getTransitionSeq()
    .catch(err => {
      logger.error('transitions: error fetching processed seq: %o', err);
      return;
    });
};

const registerFeed = seq => {
  logger.debug(`transitions: fetching changes feed, starting from ${seq}`);
  request = db.medic
    .changes({ live: true, since: seq })
    .on('change', change => {
      if (!change.id.match(IDS_TO_IGNORE) &&
          !tombstoneUtils.isTombstoneId(change.id)) {
        enqueue(change);

        const queueSize = changeQueue.length();
        if (queueSize >= MAX_QUEUE_SIZE && request) {
          logger.debug(`transitions: queue size ${queueSize} greater than ${MAX_QUEUE_SIZE}, we stop listening`);
          request.cancel();
          request = null;
        }
      }
    })
    .on('error', err => {
      logger.error('transitions: error from changes feed: %o', err);
      request = null;
      setTimeout(() => listen(), RETRY_TIMEOUT);
    });
  return request;
};

const deleteReadDocs = change => {
  // we don't know if the deleted doc was a report or a message so
  // attempt to delete both
  const possibleReadDocIds = ['report', 'message'].map(
    type => `read:${type}:${change.id}`
  );

  return db.allDbs().then(dbs => {
    const userDbs = dbs.filter(dbName => dbName.indexOf(`${db.medicDbName}-user-`) === 0);
    return userDbs.reduce((p, userDb) => {
      return p.then(() => {
        const metaDb = db.get(userDb);
        return metaDb
          .allDocs({ keys: possibleReadDocIds })
          .then(results => {
            const row = results.rows.find(row => !row.error);
            if (!row) {
              return;
            }

            return metaDb.remove(row.id, row.value.rev).catch(err => {
              // ignore 404s or 409s - the doc was probably deleted client side already
              if (err && err.status !== 404 && err.status !== 409) {
                throw err;
              }
            });
          })
          .then(() => {
            db.close(metaDb);
          })
          .catch(err => {
            db.close(metaDb);
            throw err;
          });
      });
    }, Promise.resolve());

  });
};


const changeQueue = async.queue((change, callback) => {
  if (!change) {
    return callback();
  }
  logger.debug(`change event on doc ${change.id} seq ${change.seq}`);
  if (processed > 0 && processed % PROGRESS_REPORT_INTERVAL === 0) {
    logger.info(
      `transitions: ${processed} items processed (since sentinel started)`
    );
  }
  if (change.deleted) {
    // don't run transitions on deleted docs, but do clean up
    return Promise
      .all([
        transitionsLib.infodoc.delete(change),
        deleteReadDocs(change)
      ])
      .catch(err => {
        logger.error('Error cleaning up deleted doc: %o', err);
      })
      .then(() => tombstoneUtils.processChange(Promise, db.medic, change, logger))
      .then(() => updateMetadata(change, callback))
      .catch(callback);
  }

  transitionsLib.processChange(change, err => {
    if (err) {
      return callback(err);
    }

    updateMetadata(change, callback);
  });
});

changeQueue.drain(() => {
  logger.debug(`transitions: queue drained`);
  listen();
});

const listen = () => {
  changeQueue.resume();
  if (!request) {
    logger.info('transitions: processing enabled');
    return getTransitionSeq().then(seq => registerFeed(seq));
  }
};

module.exports = {

  /**
   * Start listening from the last processed seq. Will restart
   * automatically on error.
   */
  listen,

  /**
   * Stops listening for changes. Must be restarted manually
   * by calling listen.
   */
  cancel: () => {
    changeQueue.pause();
    if (request) {
      request.cancel();
      request = null;
    }
  },

  // exposed for testing
  _changeQueue: changeQueue,
  _deleteReadDocs: deleteReadDocs,
  _transitionsLib: transitionsLib,
  _enqueue: enqueue,
};
