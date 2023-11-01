const async = require('async');
const logger = require('./logger');
const db = require('../db');
const metadata = require('./metadata');
const changeRetryHistory = require('./change-retry-history');
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
    });
};

const registerFeed = (seq) => {
  if (request || changeQueue.paused) {
    return;
  }
  logger.info('transitions: processing enabled');
  logger.debug(`transitions: fetching changes feed, starting from ${seq}`);
  request = db.medic
    .changes({ live: true, since: seq })
    .on('change', change => {
      if (
        !change.id.match(IDS_TO_IGNORE) &&
        !tombstoneUtils.isTombstoneId(change.id) &&
        changeRetryHistory.shouldProcess(change)
      ) {
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
      setTimeout(() => resumeProcessing(), RETRY_TIMEOUT);
    });
  return request;
};

const waitForShardSync = async (change) => {
  do {
    try {
      return await db.shardSynced(change);
    } catch (err) {
      logger.debug(`Error when reading doc with full read: %o`, err);
    }
    // eslint-disable-next-line no-constant-condition
  } while (true);
};

const changeQueue = async.queue( (change, callback) => {
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
    return updateMetadata(change, callback);
  }

  return waitForShardSync(change).then(() => {
    transitionsLib.processChange(change, err => {
      if (err) {
        changeRetryHistory.add(change);
        return callback(err);
      }

      updateMetadata(change, callback);
    });
  })
});

const resumeProcessing = () => {
  return getTransitionSeq().then(seq => registerFeed(seq));
};

changeQueue.drain(() => {
  logger.debug(`transitions: queue drained`);
  resumeProcessing();
});

const listen = () => {
  changeQueue.resume();
  return resumeProcessing();
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
      request.cancel && request.cancel();
      request = null;
    }
  },

  // exposed for testing
  _changeQueue: changeQueue,
  _transitionsLib: transitionsLib,
  _enqueue: enqueue,
};
