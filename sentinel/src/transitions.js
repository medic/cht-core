const async = require('async'),
      feed = require('./lib/feed'),
      db = require('./db'),
      logger = require('./lib/logger'),
      metadata = require('./lib/metadata'),
      tombstoneUtils = require('@medic/tombstone-utils'),
      transitionsLib = require('./config').getTransitionsLib(),
      PROGRESS_REPORT_INTERVAL = 500; // items

let changesFeed,
    processed = 0;

const loadTransitions = () => {
  try {
    transitionsLib.loadTransitions();
    module.exports._attach();
  } catch (e) {
    logger.error('Transitions are disabled until the above configuration errors are fixed.');
    module.exports._detach();
  }
};

const detach = () => {
  if (changesFeed) {
    changesFeed.cancel();
    changesFeed = null;
  }
};

/*
 *  Setup changes feed listener.
 */
const attach = () => {
  if (!changesFeed) {
    logger.info('transitions: processing enabled');
    return metadata
      .getProcessedSeq()
      .catch(err => {
        logger.error('transitions: error fetching processed seq: %o', err);
      })
      .then(seq => {
        logger.info(`transitions: fetching changes feed, starting from ${seq}`);
        changesFeed = feed.followFeed(seq, changeQueue);
      });
  }
};

const processChange = (change, callback) => {
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
};

const changeQueue = async.queue(processChange);

const updateMetadata = (change, callback) => {
  processed++;
  metadata
    .update(change.seq)
    .then(() => callback())
    .catch(callback);
};

const deleteReadDocs = change => {
  // we don't know if the deleted doc was a report or a message so
  // attempt to delete both
  const possibleReadDocIds = ['report', 'message'].map(
    type => `read:${type}:${change.id}`
  );

  return db.allDbs().then(dbs => {
    const userDbs = dbs.filter(db => db.indexOf('medic-user-') === 0);
    return userDbs.reduce((p, userDb) => {
      return p.then(() => {
        const metaDb = db.get(userDb);
        return metaDb.allDocs({ keys: possibleReadDocIds }).then(results => {
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
        });
      });
    }, Promise.resolve());

  });
};

module.exports = {
  _changeQueue: changeQueue,
  _attach: attach,
  _detach: detach,
  _deleteReadDocs: deleteReadDocs,
  loadTransitions: loadTransitions,
  _transitionsLib: transitionsLib
};
