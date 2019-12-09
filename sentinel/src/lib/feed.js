const logger = require('./logger');
const db = require('../db');
const metadata = require('./metadata');
const tombstoneUtils = require('@medic/tombstone-utils');

// we don't run transitions on ddocs or info docs
const IDS_TO_IGNORE = /^_design\/|-info$/;

const RETRY_TIMEOUT = 60000; // 1 minute

let listener;
let handler;

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
  return db.medic
    .changes({ live: true, since: seq })
    .on('change', change => {
      if (!change.id.match(IDS_TO_IGNORE) &&
          !tombstoneUtils.isTombstoneId(change.id)) {
        listener(change);
      }
    })
    .on('error', err => {
      logger.error('transitions: error from changes feed: %o', err);
      module.exports.cancel().then(() => {
        setTimeout(() => init(), RETRY_TIMEOUT);
      });
    })
    .catch(() => {
      // catch to avoid unhandled rejection - it's handled above
    });
};

const init = () => {
  if (!handler) {
    handler = getProcessedSeq().then(seq => registerFeed(seq));
  }
};

module.exports = {
  listen: callback => {
    logger.info('transitions: processing enabled');
    listener = callback;
    init();
  },
  cancel: () => {
    if (handler) {
      return handler.then(pouchRequest => {
        if (pouchRequest) {
          pouchRequest.cancel();
        }
        handler = null;
      });
    }
  },
  _handler: () => handler,
  _restore: () => {
    handler = undefined;
    listener = undefined;
  }
};
