const follow = require('follow'),
      logger = require('./logger');

const followFeed = (seq, queue) => {
  // We log the first time we catch up to the changes feed
  let caughtUpOnce;

  const feed = new follow.Feed({db: process.env.COUCH_URL, since: seq});
  feed.on('change', change => {
    // skip uninteresting documents
    if (change.id.match(/^_design\//)) {
      return;
    }
    queue.push(change);
  });
  feed.on('error', err => {
    logger.error('transitions: error from changes feed', err);
  });
  feed.on('catchup', seq => {
    if (!caughtUpOnce) {
      caughtUpOnce = true;
      logger.info(`Sentinel caught up to ${seq}`);
    }
  });
  feed.follow();
  return feed;
};

module.exports = {
  followFeed: (seq, queue) => followFeed(seq, queue)
};
