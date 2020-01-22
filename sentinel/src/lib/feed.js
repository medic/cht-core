const logger = require('./logger');
const db = require('../db');
const metadata = require('./metadata');
const tombstoneUtils = require('@medic/tombstone-utils');

// we don't run transitions on ddocs or info docs
const IDS_TO_IGNORE = /^_design\/|-info$/;

const RETRY_TIMEOUT = 60000; // 1 minute

let listener;
let init;
let request;

const getProcessedSeq = () => {
  return metadata
    .getProcessedSeq()
    .catch(err => {
      logger.error('transitions: error fetching processed seq: %o', err);
      return;
    });
};

const registerFeed = seq => {
  logger.info(`transitions: fetching changes feed, starting from ${seq}`);
  request = db.medic
    .changes({ live: true, since: seq })
    .on('change', change => {
      if (!change.id.match(IDS_TO_IGNORE) &&
          !tombstoneUtils.isTombstoneId(change.id)) {
        listener(change);
      }
    })
    .on('error', err => {
      logger.error('transitions: error from changes feed: %o', err);
      init = null;
      setTimeout(() => listen(), RETRY_TIMEOUT);
    });
};

const listen = () => {
  if (!init) {
    init = getProcessedSeq().then(seq => registerFeed(seq));
  }
};

module.exports = {

  /**
   * Start listening from the last processed seq. Will restart
   * automatically on error.
   * @param {Function} callback Called with a change Object.
   */
  listen: callback => {
    logger.info('transitions: processing enabled');
    listener = callback;
    listen();
    return init;
  },

  /**
   * Stops listening for changes. Must be restarted manually
   * by calling listen.
   */
  cancel: () => {
    // let initialisation finish but check for null init
    const p = init || Promise.resolve();
    return p.then(() => {
      if (request) {
        request.cancel();
      }
      init = null;
      request = null;
      listener = null;
    });
  }

};