const _ = require('underscore'),
      async = require('async'),
      feed = require('./lib/feed'),
      db = require('./db'),
      lineage = require('@medic/lineage')(Promise, db.medic),
      logger = require('./lib/logger'),
      metadata = require('./lib/metadata'),
      tombstoneUtils = require('@medic/tombstone-utils'),
      sentinelLib = require('@medic/sentinel'),
      infodoc = sentinelLib.infodoc,
      PROCESSING_DELAY = 50, // ms
      PROGRESS_REPORT_INTERVAL = 500; // items

let changesFeed,
    transitions,
    processed = 0;

const loadTransitions = () => {
  transitions = sentinelLib.transitions.loadTransitions();

  if (!transitions) {
    logger.error('Transitions are disabled until the above configuration errors are fixed.');
    module.exports._detach();
  } else {
    module.exports._attach();
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

const changeQueue = async.queue((task, callback) =>
  processChange(task, () => _.delay(callback, PROCESSING_DELAY))
);

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
        infodoc.delete(change),
        deleteReadDocs(change)
      ])
      .catch(err => {
        logger.error('Error cleaning up deleted doc: %o', err);
      })
      .then(() => tombstoneUtils.processChange(Promise, db.medic, change, logger))
      .then(() => {
        processed++;
        return metadata
          .update(change.seq)
          .then(() => callback());
      })
      .catch(callback);
  }

  lineage
    .fetchHydratedDoc(change.id)
    .then(doc => {
      change.doc = doc;
      return infodoc.get(change).then(infoDoc => {
        change.info = infoDoc;
        // Remove transitions from doc since those
        // will be handled by the info doc(sentinel db) after this
        if (change.doc.transitions) {
          delete change.doc.transitions;
        }
        applyTransitions(change, transitions, () => {
          processed++;
          metadata
            .update(change.seq)
            .then(() => callback())
            .catch(err => {
              callback(err);
            });
        });
      });
    })
    .catch(err => {
      logger.error('transitions: fetch failed for %s : %o', change.id, err);
      return callback();
    });
};

const applyTransitions = (change, transitions, callback) => {
  sentinelLib.transitions.applyTransitions(
    change,
    transitions,
    (err, results) => finalize({ change, results }, callback)
  );
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

/*
 * Save the doc if we have changes from transitions, otherwise transitions
 * did nothing and saving is unnecessary.  If results has a true value in
 * it then a change was made.
 */
const finalize = ({ change, results }, callback) => {
  logger.debug(`transition results: ${JSON.stringify(results)}`);

  const changed = _.some(results, i => Boolean(i));
  if (!changed) {
    logger.debug(
      `nothing changed skipping saveDoc for doc ${change.id} seq ${change.seq}`
    );
    return callback();
  }
  logger.debug(`calling saveDoc on doc ${change.id} seq ${change.seq}`);

  lineage.minify(change.doc);
  db.medic.put(change.doc, err => {
    // todo: how to handle a failed save? for now just
    // waiting until next change and try again.
    if (err) {
      logger.error(
        `error saving changes on doc ${change.id} seq ${
          change.seq
          }: ${JSON.stringify(err)}`
      );
    } else {
      logger.info(`saved changes on doc ${change.id} seq ${change.seq}`);
    }
    return callback();
  });
};

module.exports = {
  _changeQueue: changeQueue,
  _attach: attach,
  _detach: detach,
  _deleteReadDocs: deleteReadDocs,
  _lineage: lineage,
  loadTransitions: loadTransitions,
  finalize: finalize
};
