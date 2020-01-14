const logger = require('./logger');
const db = require('../db');
const metadata = require('./metadata');
const tombstoneUtils = require('@medic/tombstone-utils');

// we don't run transitions on ddocs or info docs
const IDS_TO_IGNORE = /^_design\/|-info$/;

const RETRY_TIMEOUT = 60000; // 1 minute

const CHANGES_LIMIT = 100; // 100 documents of size 10K => 1MB 

let handler;
let initFetch;
let initListen;
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
  request =  db.medic
    .changes({ live: true, since: seq })
    .on('change', function listener(change) {
      logger.info(`transitions: new incoming changes startimng with change with id ${change.id}`);
      request.cancel();
      request.removeListener('change', listener);
      initListen = null;
      fetch();
    })
    .on('error', err => {
      logger.error('transitions: error listening to changes feed: %o', err);
      initListen = null;
      setTimeout(() => listen(), RETRY_TIMEOUT);
    });
};

const fetchFeed = seq => {
  logger.info(`transitions: fetching ${CHANGES_LIMIT} changes from changes feed, starting from ${seq}`);
  return db.medic
    .changes({ limit: CHANGES_LIMIT, since: seq })
    .then(changes => {
      changes.results.forEach(change => {
        if (!change.id.match(IDS_TO_IGNORE) &&
            !tombstoneUtils.isTombstoneId(change.id)) {
          handler(change);
        }
      });

      if (changes.results.length === 0) {
        logger.info(`transitions: no more changes, fetching changes feed, starting from ${seq}`);
        listen();
      }
    })
    .catch(err => {
      logger.error('transitions: error fetching from changes feed: %o', err);
      setTimeout(() => fetch(), RETRY_TIMEOUT);
    });
};

const listen = () => {
  if (!initListen) {
    initListen = getProcessedSeq().then(seq => registerFeed(seq));
  }
};

const fetch = () => {
  initFetch = getProcessedSeq().then(seq => fetchFeed(seq));
};

module.exports = {

  /**
   * Start listening from the last processed seq. Will restart
   * automatically on error.
   * @param {Function} callback Called with a change Object.
   */
  fetch: callback => {
    logger.info('transitions: processing enabled');
    handler = callback;
    fetch();
    return initFetch;
  },

  /**
   * Stops listening for changes. Must be restarted manually
   * by calling listen.
   */
  cancel: () => {
    // let initialisation finish but check for null init
    const fetch = initFetch || Promise.resolve();
    const listen = initListen || Promise.resolve();
    return Promise.all([fetch, listen]).then(() => {
      if (request) {
        request.cancel();
      }
      initFetch = null;
      initListen = null;
      request = null;
      handler = null;
    });
  },

  initListen: initListen,

  initFetch: initFetch

};
