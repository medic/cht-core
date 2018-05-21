const logger = require('./logger'),
      db = require('../db-pouch');

const followFeed = (seq, queue) => {
  return db.medic.changes({ live: true, since: seq })
    .on('change', change => {
      // skip uninteresting documents
      if (change.id.match(/^_design\//)) {
        return;
      }
      queue.push(change);
    })
    .on('error', err => {
      logger.error('transitions: error from changes feed', err);
    });
};

module.exports = {
  followFeed: (seq, queue) => followFeed(seq, queue)
};
