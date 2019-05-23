const logger = require('./logger');
const db = require('../db'),
      tombstoneUtils = require('@medic/tombstone-utils');

// we don't run transitions on ddocs or info docs
const IDS_TO_IGNORE = /^_design\/|-info$/;

module.exports = {
  followFeed: (seq, queue) => {
    return db.medic
      .changes({ live: true, since: seq })
      .on('change', change => {
        if (!change.id.match(IDS_TO_IGNORE) && !tombstoneUtils.isTombstoneId(change.id)) {
          queue.push(change);
        }
      })
      .on('error', err => {
        logger.error('transitions: error from changes feed: %o', err);
      });
  }
};
